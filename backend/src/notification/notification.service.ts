import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as moment from "moment-timezone";
import { NotificationLogModel } from "../models/notification-log.schema";
import { CalendarEvent } from "../calendar/calendar.service";
import { USER_FULL_NAMES, SLACK_USER_ID_MAP, VIETNAM_TZ } from "../constants";
import { NotifyConfigService, DEFAULT_MESSAGE_TEMPLATE } from "../notify-config/notify-config.service";

export type TriggerType = "scheduler" | "scheduler-end" | "manual";

@Injectable()
export class NotificationService {
  private readonly telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
  private readonly telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";
  private readonly slackBotToken = process.env.SLACK_BOT_TOKEN || "";
  private readonly botGithubLogin = process.env.BOT_GITHUB_LOGIN || "mmenutech";

  constructor(
    private readonly configService: NotifyConfigService,
  ) {}

  /** Gửi thông báo cho một event. Trả về true nếu gửi, false nếu skip. */
  async sendForEvent(
    event: CalendarEvent,
    triggerType: TriggerType,
    templateOverride?: string,
  ): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
    // Idempotency: kiểm tra đã gửi thành công chưa
    const existing = await NotificationLogModel.findOne({
      date: event.date,
      calendarEventId: event.id,
      triggerType,
      status: "sent",
    });

    if (existing) {
      return { sent: false, skipped: true };
    }

    const config = await this.configService.getConfig();
    const template = templateOverride || config.messageTemplate || DEFAULT_MESSAGE_TEMPLATE;
    const message = this.buildMessage(event, template);
    const githubLogin = event.githubLogin || this.botGithubLogin;

    const MAX_RETRIES = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // await this.sendTelegram(message); // tạm comment — chưa gửi Telegram
        await this.sendSlackDM(githubLogin, message);
        lastError = undefined;
        break;
      } catch (err: any) {
        lastError = err?.response?.data?.description || err?.message || "Unknown error";
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }

    // Upsert log (handle race condition bằng upsert)
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

    if (lastError) {
      return { sent: false, error: lastError };
    }
    return { sent: true };
  }

  private async sendTelegram(message: string): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) {
      throw new Error("TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được cấu hình");
    }
    await axios.post(
      `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
      { chat_id: this.telegramChatId, text: message, parse_mode: "HTML" }
    );
  }

  /** Gửi webhook vào channel group (fallback khi không có bot token) */
  private async sendSlackWebhook(githubLogin: string, message: string): Promise<void> {
    if (!this.slackWebhookUrl) return;
    const slackText = `${githubLogin} gửi tin nhắn\n"${message}"`;
    await axios.post(this.slackWebhookUrl, { text: slackText });
  }

  /** Gửi DM trực tiếp đến người trực qua Slack Bot API */
  private async sendSlackDM(githubLogin: string, message: string): Promise<void> {
    const slackUserId = SLACK_USER_ID_MAP[githubLogin];

    if (!slackUserId || !this.slackBotToken) {
      // Không có user ID hoặc bot token → fallback về webhook group
      await this.sendSlackWebhook(githubLogin, message);
      return;
    }

    const headers = {
      Authorization: `Bearer ${this.slackBotToken}`,
      "Content-Type": "application/json",
    };

    // Dùng thẳng Slack user ID làm channel — không cần conversations.open
    const slackMessage = this.htmlToMrkdwn(message);
    const postRes = await axios.post(
      "https://slack.com/api/chat.postMessage",
      { channel: slackUserId, text: slackMessage, mrkdwn: true },
      { headers }
    );

    if (!postRes.data.ok) {
      throw new Error(`chat.postMessage failed: ${postRes.data.error}`);
    }
  }

  /** Chuyển HTML cơ bản sang Slack mrkdwn */
  private htmlToMrkdwn(html: string): string {
    return html
      .replace(/<b>(.*?)<\/b>/gi, "*$1*")
      .replace(/<i>(.*?)<\/i>/gi, "_$1_")
      .replace(/<code>(.*?)<\/code>/gi, "`$1`")
      .replace(/<[^>]+>/g, ""); // strip các tag còn lại
  }

  private buildMessage(event: CalendarEvent, template: string): string {
    const displayName =
      event.githubLogin && USER_FULL_NAMES[event.githubLogin]
        ? USER_FULL_NAMES[event.githubLogin]
        : event.summary;

    const dateFormatted = moment
      .tz(event.date, VIETNAM_TZ)
      .locale("vi")
      .format("dddd, DD/MM/YYYY");

    let timeRange = "Cả ngày";
    if (event.startDateTime && event.endDateTime) {
      const s = moment.tz(event.startDateTime, VIETNAM_TZ).format("HH:mm");
      const e = moment.tz(event.endDateTime, VIETNAM_TZ).format("HH:mm");
      timeRange = `${s} – ${e}`;
    }

    return template
      .replace(/\{name\}/g, displayName)
      .replace(/\{date\}/g, dateFormatted)
      .replace(/\{time\}/g, timeRange)
      .replace(/\{summary\}/g, event.summary);
  }

  async getLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationLogModel.find()
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationLogModel.countDocuments(),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
