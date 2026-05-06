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

  @Cron("* * * * *")
  async checkAndNotify() {
    const config = await this.notifyConfigService.getConfig();
    if (!config.enabled) return;
    if (!config.ownerCalendarName) return;

    const now = moment.tz(VIETNAM_TZ);
    const dayOfWeek = now.day();
    if (config.activeDays.length > 0 && !config.activeDays.includes(dayOfWeek)) return;

    const today = now.format("YYYY-MM-DD");
    const tomorrow = now.clone().add(1, "day").format("YYYY-MM-DD");
    const ownerName = config.ownerCalendarName.toLowerCase();

    // Gửi đầu ngày
    if (config.sendAtDayStart && config.startShiftMessage) {
      const [hh, mm] = config.dayStartTime.split(":").map(Number);
      const dayStartMoment = moment.tz(today, VIETNAM_TZ).hour(hh).minute(mm);
      if (Math.abs(now.diff(dayStartMoment, "minutes")) <= 1) {
        const events = await this.calendarService.getEventsForDate(today);
        const ownerEvents = events.filter(e => e.summary.toLowerCase().includes(ownerName));
        for (const event of ownerEvents) {
          const result = await this.notificationService.sendForEvent(event, "scheduler", config.startShiftMessage);
          if (result.sent) this.logger.log(`[Scheduler] Sent day-start: "${event.summary}"`);
        }
      }
    }

    const [allToday, allTomorrow] = await Promise.all([
      this.calendarService.getEventsForDate(today),
      this.calendarService.getEventsForDate(tomorrow),
    ]);

    const todayEvents = allToday.filter(e => e.summary.toLowerCase().includes(ownerName));
    const tomorrowEvents = allTomorrow.filter(e => e.summary.toLowerCase().includes(ownerName));

    // Nhắc trước ca
    if (config.sendBeforeMinutes > 0 && config.startShiftMessage) {
      for (const event of [...todayEvents, ...tomorrowEvents]) {
        if (!event.startDateTime) continue;
        const notifyAt = moment.tz(event.startDateTime, VIETNAM_TZ).subtract(config.sendBeforeMinutes, "minutes");
        if (Math.abs(now.diff(notifyAt, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(event, "scheduler", config.startShiftMessage);
          if (result.sent) this.logger.log(`[Scheduler] Sent pre-shift: "${event.summary}"`);
          else if (result.error) this.logger.error(`[Scheduler] Failed pre-shift: "${event.summary}" — ${result.error}`);
        }
      }
    }

    // Gửi cuối ca
    if (config.sendAtShiftEnd && config.endShiftMessage) {
      for (const event of todayEvents) {
        if (!event.endDateTime) continue;
        const endMoment = moment.tz(event.endDateTime, VIETNAM_TZ);
        if (Math.abs(now.diff(endMoment, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(event, "scheduler-end", config.endShiftMessage);
          if (result.sent) this.logger.log(`[Scheduler] Sent end-shift: "${event.summary}"`);
          else if (result.error) this.logger.error(`[Scheduler] Failed end-shift: "${event.summary}" — ${result.error}`);
        }
      }
    }
  }
}
