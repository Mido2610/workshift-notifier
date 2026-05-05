import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as moment from "moment-timezone";
import { NotificationLogModel } from "../models/notification-log.schema";
import { CalendarEvent } from "../calendar/calendar.service";
import { USER_FULL_NAMES, VIETNAM_TZ } from "../constants";

export type TriggerType = "scheduler" | "manual";

@Injectable()
export class NotificationService {
  private readonly emApiUrl =
    process.env.EM_API_URL || "http://localhost:8080";
  private readonly botGithubLogin =
    process.env.BOT_GITHUB_LOGIN || "mmenutech";

  /** Gửi thông báo cho một event. Trả về true nếu gửi, false nếu skip. */
  async sendForEvent(
    event: CalendarEvent,
    triggerType: TriggerType
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

    const message = this.buildMessage(event);
    const githubLogin = event.githubLogin || this.botGithubLogin;

    const MAX_RETRIES = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await axios.post(`${this.emApiUrl}/api/cs-notify/workshift/submit-message`, {
          githubLogin,
          message,
        });
        lastError = undefined;
        break;
      } catch (err: any) {
        lastError =
          err?.response?.data?.message || err?.message || "Unknown error";
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

  private buildMessage(event: CalendarEvent): string {
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

    return [
      `🔔 <b>Thông báo lịch trực</b>`,
      `📅 Ngày: ${dateFormatted}`,
      `👤 Người trực: <b>${displayName}</b>`,
      `⏰ Ca: ${timeRange}`,
      ``,
      `<i>Gửi tự động bởi Workshift Notifier</i>`,
    ].join("\n");
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
