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

    const now = moment.tz(VIETNAM_TZ);
    const today = now.format("YYYY-MM-DD");
    const tomorrow = now.clone().add(1, "day").format("YYYY-MM-DD");

    // Gửi đầu ngày (dayStartTime ± 1 phút)
    if (config.sendAtDayStart) {
      const [hh, mm] = config.dayStartTime.split(":").map(Number);
      const dayStartMoment = moment.tz(today, VIETNAM_TZ).hour(hh).minute(mm);
      if (Math.abs(now.diff(dayStartMoment, "minutes")) <= 1) {
        await this.sendForDay(today, "day-start");
      }
    }

    // Gửi trước ca (sendBeforeMinutes trước startDateTime)
    if (config.sendBeforeMinutes > 0) {
      const [todayEvents, tomorrowEvents] = await Promise.all([
        this.calendarService.getEventsForDate(today),
        this.calendarService.getEventsForDate(tomorrow),
      ]);

      for (const event of [...todayEvents, ...tomorrowEvents]) {
        if (!event.startDateTime) continue;
        const startMoment = moment.tz(event.startDateTime, VIETNAM_TZ);
        const notifyAt = startMoment.clone().subtract(config.sendBeforeMinutes, "minutes");
        if (Math.abs(now.diff(notifyAt, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(
            event,
            "scheduler"
          );
          if (result.sent) {
            this.logger.log(`[Scheduler] Sent pre-shift notification: "${event.summary}"`);
          } else if (result.skipped) {
            this.logger.verbose(`[Scheduler] Skipped (already sent): "${event.summary}"`);
          } else {
            this.logger.error(`[Scheduler] Failed: "${event.summary}" — ${result.error}`);
          }
        }
      }
    }
  }

  private async sendForDay(date: string, label: string) {
    const events = await this.calendarService.getEventsForDate(date);
    let sent = 0;
    for (const event of events) {
      const result = await this.notificationService.sendForEvent(
        event,
        "scheduler"
      );
      if (result.sent) sent++;
    }
    this.logger.log(
      `[Scheduler] ${label} for ${date}: sent=${sent}/${events.length}`
    );
  }
}
