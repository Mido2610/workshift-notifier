import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as moment from "moment-timezone";
import { CalendarService } from "../calendar/calendar.service";
import { NotificationService } from "../notification/notification.service";
import { NotifyConfigService } from "../notify-config/notify-config.service";
import { VIETNAM_TZ } from "../constants";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly notificationService: NotificationService,
    private readonly notifyConfigService: NotifyConfigService
  ) {}

  /**
   * Chạy mỗi phút.
   * Kiểm tra xem có event nào cần gửi thông báo không.
   */
  @Cron("* * * * *")
  async checkAndNotify() {
    const config = await this.notifyConfigService.getConfig();
    if (!config.enabled) return;
    if (!config.ownerCalendarName) return; // bắt buộc phải cấu hình tên trong Calendar

    const now = moment.tz(VIETNAM_TZ);
    const dayOfWeek = now.day(); // 0=CN, 1=T2, ..., 6=T7
    if (config.activeDays.length > 0 && !config.activeDays.includes(dayOfWeek)) return;

    const today = now.format("YYYY-MM-DD");
    const tomorrow = now.clone().add(1, "day").format("YYYY-MM-DD");

    // Gửi đầu ngày (dayStartTime ± 1 phút)
    if (config.sendAtDayStart) {
      const [hh, mm] = config.dayStartTime.split(":").map(Number);
      const dayStartMoment = moment.tz(today, VIETNAM_TZ).hour(hh).minute(mm);
      if (Math.abs(now.diff(dayStartMoment, "minutes")) <= 1) {
        await this.sendForDay(today, "day-start", config.ownerCalendarName);
      }
    }

    const [allToday, allTomorrow] = await Promise.all([
      this.calendarService.getEventsForDate(today),
      this.calendarService.getEventsForDate(tomorrow),
    ]);

    // Chỉ lấy event của owner
    const ownerName = config.ownerCalendarName.toLowerCase();
    const todayEvents = allToday.filter(e => e.summary.toLowerCase().includes(ownerName));
    const tomorrowEvents = allTomorrow.filter(e => e.summary.toLowerCase().includes(ownerName));

    // Gửi trước ca (sendBeforeMinutes trước startDateTime)
    if (config.sendBeforeMinutes > 0) {
      for (const event of [...todayEvents, ...tomorrowEvents]) {
        if (!event.startDateTime) continue;
        const startMoment = moment.tz(event.startDateTime, VIETNAM_TZ);
        const notifyAt = startMoment.clone().subtract(config.sendBeforeMinutes, "minutes");
        if (Math.abs(now.diff(notifyAt, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(event, "scheduler");
          if (result.sent) {
            this.logger.log(`[Scheduler] Sent pre-shift: "${event.summary}"`);
          } else if (result.skipped) {
            this.logger.verbose(`[Scheduler] Skipped pre-shift: "${event.summary}"`);
          } else {
            this.logger.error(`[Scheduler] Failed pre-shift: "${event.summary}" — ${result.error}`);
          }
        }
      }
    }

    // Gửi cuối ca (tại endDateTime)
    if (config.sendAtShiftEnd && config.endShiftMessageTemplate) {
      for (const event of todayEvents) {
        if (!event.endDateTime) continue;
        const endMoment = moment.tz(event.endDateTime, VIETNAM_TZ);
        if (Math.abs(now.diff(endMoment, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(
            event,
            "scheduler-end",
            config.endShiftMessageTemplate,
          );
          if (result.sent) {
            this.logger.log(`[Scheduler] Sent end-shift: "${event.summary}"`);
          } else if (result.skipped) {
            this.logger.verbose(`[Scheduler] Skipped end-shift: "${event.summary}"`);
          } else {
            this.logger.error(`[Scheduler] Failed end-shift: "${event.summary}" — ${result.error}`);
          }
        }
      }
    }
  }

  private async sendForDay(date: string, label: string, ownerLogin: string) {
    const events = await this.calendarService.getEventsForDate(date);
    const ownerEvents = events.filter(e => e.summary.toLowerCase().includes(ownerLogin.toLowerCase()));
    let sent = 0;
    for (const event of ownerEvents) {
      const result = await this.notificationService.sendForEvent(
        event,
        "scheduler"
      );
      if (result.sent) sent++;
    }
    this.logger.log(
      `[Scheduler] ${label} for ${date}: sent=${sent}/${ownerEvents.length}`
    );
  }
}
