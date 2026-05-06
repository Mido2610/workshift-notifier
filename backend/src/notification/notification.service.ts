import { Injectable } from "@nestjs/common";
import axios from "axios";
import { NotificationLogModel } from "../models/notification-log.schema";
import { CalendarEvent } from "../calendar/calendar.service";

export type TriggerType = "scheduler" | "scheduler-end" | "manual";

@Injectable()
export class NotificationService {
  private readonly telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
  private readonly telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";

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

  private async sendToChannel(githubLogin: string, message: string): Promise<void> {
    const slackText = `${githubLogin}\n${message}`;
    await Promise.all([
      this.slackWebhookUrl
        ? axios.post(this.slackWebhookUrl, { text: slackText })
        : Promise.resolve(),
      this.telegramBotToken && this.telegramChatId
        ? axios.post(
            `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
            { chat_id: this.telegramChatId, text: message, parse_mode: "HTML" }
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

