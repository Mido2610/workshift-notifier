import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as moment from "moment-timezone";
import axios from "axios";
import { CalendarService } from "../calendar/calendar.service";
import { NotificationService } from "../notification/notification.service";
import { NotifyConfigService, NotifyConfig } from "../notify-config/notify-config.service";
import { TelegramLinkModel } from "../models/telegram-link.schema";
import { ShiftLogModel } from "../models/shift-log.schema";
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
    const allConfigs = await this.notifyConfigService.getAllEnabled();
    for (const config of allConfigs) {
      await this.processUser(config).catch((err) =>
        this.logger.error(`[Scheduler] Error for ${config.githubLogin}: ${err.message}`)
      );
    }
  }

  private async processUser(config: NotifyConfig) {
    if (!config.ownerCalendarName) return;

    const now = moment.tz(VIETNAM_TZ);
    const dayOfWeek = now.day();
    if (config.activeDays.length > 0 && !config.activeDays.includes(dayOfWeek)) return;

    const today = now.format("YYYY-MM-DD");
    const tomorrow = now.clone().add(1, "day").format("YYYY-MM-DD");
    const ownerName = config.ownerCalendarName.toLowerCase();

    const matchesOwner = (e: { summary: string; displayName?: string }) => {
      return (
        e.summary.toLowerCase().includes(ownerName) ||
        (e.displayName || "").toLowerCase().includes(ownerName)
      );
    };

    // Gửi đầu ngày — DM riêng cho người trực
    if (config.sendAtDayStart && config.startShiftMessage) {
      const [hh, mm] = config.dayStartTime.split(":").map(Number);
      const dayStartMoment = moment.tz(today, VIETNAM_TZ).hour(hh).minute(mm);
      if (Math.abs(now.diff(dayStartMoment, "minutes")) <= 1) {
        const events = await this.calendarService.getEventsForDate(today);
        const hasShift = events.some(matchesOwner);
        if (hasShift) {
          const result = await this.notificationService.sendDayStartDm(
            config.githubLogin, config.startShiftMessage, today
          );
          if (result.sent) this.logger.log(`[Scheduler] Day-start DM → ${config.githubLogin}`);
          else if (result.error) this.logger.error(`[Scheduler] Day-start DM fail → ${config.githubLogin}: ${result.error}`);
        }
      }
    }

    const [allToday, allTomorrow] = await Promise.all([
      this.calendarService.getEventsForDate(today),
      this.calendarService.getEventsForDate(tomorrow),
    ]);

    const todayEvents = allToday.filter(matchesOwner);
    const tomorrowEvents = allTomorrow.filter(matchesOwner);

    // Nhắc trước ca
    if (config.sendBeforeMinutes > 0 && config.startShiftMessage) {
      for (const event of [...todayEvents, ...tomorrowEvents]) {
        if (!event.startDateTime) continue;
        const notifyAt = moment.tz(event.startDateTime, VIETNAM_TZ).subtract(config.sendBeforeMinutes, "minutes");
        if (Math.abs(now.diff(notifyAt, "minutes")) <= 1) {
          const result = await this.notificationService.sendForEvent(event, "scheduler", config.startShiftMessage);
          if (result.sent) this.logger.log(`[Scheduler] Pre-shift → ${config.githubLogin}: "${event.summary}"`);
          else if (result.error) this.logger.error(`[Scheduler] Pre-shift fail → ${config.githubLogin}: ${result.error}`);
        }
      }
    }

    // Gửi cuối ca
    if (config.endShiftMessage && todayEvents.length > 0) {
      let shouldSendEnd = false;
      if (config.dayEndTime) {
        const [hh, mm] = config.dayEndTime.split(":").map(Number);
        const endMoment = moment.tz(today, VIETNAM_TZ).hour(hh).minute(mm);
        shouldSendEnd = Math.abs(now.diff(endMoment, "minutes")) <= 1;
      } else {
        for (const event of todayEvents) {
          if (!event.endDateTime) continue;
          const endMoment = moment.tz(event.endDateTime, VIETNAM_TZ);
          if (Math.abs(now.diff(endMoment, "minutes")) <= 1) { shouldSendEnd = true; break; }
        }
      }
      if (shouldSendEnd) {
        // Kiểm tra user đã /endshift qua ShiftBot chưa
        const telegramLink = await TelegramLinkModel.findOne({ githubLogin: config.githubLogin }).lean();
        if (telegramLink) {
          const shiftLog = await ShiftLogModel.findOne({
            telegramUserId: telegramLink.telegramChatId,
            date: today,
          }).lean();

          if (shiftLog?.status === "closed") {
            // User đã báo cáo qua ShiftBot → skip, không gửi duplicate
            this.logger.log(`[Scheduler] End-shift skipped (already reported via ShiftBot) → ${config.githubLogin}`);
            return;
          }

          // Có log nhưng chưa báo → nhắc qua Telegram DM
          const shiftBotToken = process.env.SHIFT_BOT_TOKEN;
          if (shiftBotToken) {
            const msgCount = shiftLog?.messages?.length ?? 0;
            const reminderText = msgCount > 0
              ? `⏰ Ca trực kết thúc rồi! Bạn có ${msgCount} ghi chú hôm nay.\nDùng /endshift trong @workshift_notifier_bot để tổng hợp và gửi báo cáo nhé.`
              : `⏰ Ca trực kết thúc rồi! Dùng /endshift trong @workshift_notifier_bot để gửi báo cáo nhé.`;
            await axios.post(
              `https://api.telegram.org/bot${shiftBotToken}/sendMessage`,
              { chat_id: telegramLink.telegramChatId, text: reminderText }
            ).catch((err: any) => this.logger.error(`[Scheduler] Telegram reminder failed: ${err?.message}`));
            this.logger.log(`[Scheduler] End-shift reminder → ${config.githubLogin}`);
            return;
          }
        }

        // Fallback: gửi endShiftMessage vào channel như cũ
        const event = todayEvents[0];
        const result = await this.notificationService.sendForEvent(event, "scheduler-end", config.endShiftMessage);
        if (result.sent) this.logger.log(`[Scheduler] End-shift → ${config.githubLogin}: "${event.summary}"`);
        else if (result.error) this.logger.error(`[Scheduler] End-shift fail → ${config.githubLogin}: ${result.error}`);
      }
    }
  }
}
