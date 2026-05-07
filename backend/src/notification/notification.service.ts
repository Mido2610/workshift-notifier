import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { NotificationLogModel } from "../models/notification-log.schema";
import { CalendarEvent } from "../calendar/calendar.service";
import { SystemConfigService } from "../system-config/system-config.service";
import { SLACK_USER_ID_MAP } from "../constants";

export type TriggerType = "scheduler" | "scheduler-end" | "scheduler-daystart" | "manual";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
  private readonly slackBotToken = process.env.SLACK_BOT_TOKEN || "";

  constructor(private readonly systemConfigService: SystemConfigService) {}

  /** Gửi message cho một event (scheduler dùng) */
  async sendForEvent(
    event: CalendarEvent,
    triggerType: TriggerType,
    message: string,
  ): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
    if (!message) return { sent: false, skipped: true };

    const existing = await NotificationLogModel.findOne({
      date: event.date,
      calendarEventId: event.id,
      triggerType,
      status: "sent",
    });
    if (existing) return { sent: false, skipped: true };

    const githubLogin = event.githubLogin || "";
    const MAX_RETRIES = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.sendToChannel(githubLogin, message);
        lastError = undefined;
        break;
      } catch (err: any) {
        lastError = err?.message || "Unknown error";
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    await NotificationLogModel.findOneAndUpdate(
      { date: event.date, calendarEventId: event.id, triggerType },
      {
        date: event.date,
        calendarEventId: event.id,
        eventSummary: event.summary,
        githubLogin,
        message,
        triggerType,
        status: lastError ? "failed" : "sent",
        sentAt: new Date(),
        errorMessage: lastError,
      },
      { upsert: true }
    );

    return lastError ? { sent: false, error: lastError } : { sent: true };
  }

  /** Gửi thẳng message từ FE */
  async sendMessage(githubLogin: string, message: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.sendToChannel(githubLogin, message);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Unknown error" };
    }
  }

  /** Gửi DM riêng cho người trực — dùng cho "Gửi đầu ngày" */
  async sendDayStartDm(githubLogin: string, message: string, eventDate: string): Promise<{ sent: boolean; error?: string }> {
    if (!message) return { sent: false };

    const existing = await NotificationLogModel.findOne({
      date: eventDate,
      githubLogin,
      triggerType: "scheduler-daystart",
      status: "sent",
    });
    if (existing) return { sent: false };

    const slackUserId = SLACK_USER_ID_MAP[githubLogin];
    let lastError: string | undefined;

    if (slackUserId && this.slackBotToken) {
      try {
        await axios.post(
          "https://slack.com/api/chat.postMessage",
          { channel: slackUserId, text: message },
          { headers: { Authorization: `Bearer ${this.slackBotToken}` } }
        );
      } catch (err: any) {
        lastError = err?.message || "Slack DM failed";
        this.logger.error(`[DM] Slack DM failed for ${githubLogin}: ${lastError}`);
      }
    } else {
      // Fallback: gửi vào channel nếu không có Slack ID
      this.logger.warn(`[DM] No Slack ID for ${githubLogin} — fallback to channel`);
      try {
        await this.sendToChannel(githubLogin, message);
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    await NotificationLogModel.findOneAndUpdate(
      { date: eventDate, githubLogin, triggerType: "scheduler-daystart" },
      {
        date: eventDate,
        calendarEventId: `daystart-${eventDate}-${githubLogin}`,
        eventSummary: `Day-start DM for ${githubLogin}`,
        githubLogin,
        message,
        triggerType: "scheduler-daystart",
        status: lastError ? "failed" : "sent",
        sentAt: new Date(),
        errorMessage: lastError,
      },
      { upsert: true }
    );

    return lastError ? { sent: false, error: lastError } : { sent: true };
  }

  private async sendToChannel(githubLogin: string, message: string): Promise<void> {
    const sys = await this.systemConfigService.getConfig();
    const slackUrl = sys.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL || "";
    const tgChatId = sys.telegramChatId || process.env.TELEGRAM_CHAT_ID || "";
    const slackText = `${githubLogin}\n${message}`;
    await Promise.all([
      slackUrl ? axios.post(slackUrl, { text: slackText }) : Promise.resolve(),
      this.telegramBotToken && tgChatId
        ? axios.post(
            `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
            { chat_id: tgChatId, text: message, parse_mode: "HTML" }
          )
        : Promise.resolve(),
    ]);
  }

  async getLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationLogModel.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationLogModel.countDocuments(),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getStats() {
    const [sent, failed, total] = await Promise.all([
      NotificationLogModel.countDocuments({ status: "sent" }),
      NotificationLogModel.countDocuments({ status: "failed" }),
      NotificationLogModel.countDocuments(),
    ]);
    return { sent, failed, total };
  }
}

