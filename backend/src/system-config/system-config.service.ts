import { Injectable } from "@nestjs/common";
import { SystemConfigModel } from "../models/system-config.schema";

export interface SystemConfig {
  calendarId: string;
  slackWebhookUrl: string;
  telegramChatId: string;
  timezone: string;
  defaultStartMessage: string;
  defaultEndMessage: string;
  updatedBy?: string;
}

const defaults: SystemConfig = {
  calendarId: process.env.GOOGLE_CALENDAR_ID || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  timezone: "Asia/Ho_Chi_Minh",
  defaultStartMessage: "",
  defaultEndMessage: "",
};

function mapDoc(doc: any): SystemConfig {
  return {
    calendarId: doc.calendarId || defaults.calendarId,
    slackWebhookUrl: doc.slackWebhookUrl || defaults.slackWebhookUrl,
    telegramChatId: doc.telegramChatId || defaults.telegramChatId,
    timezone: doc.timezone || defaults.timezone,
    defaultStartMessage: doc.defaultStartMessage || "",
    defaultEndMessage: doc.defaultEndMessage || "",
    updatedBy: doc.updatedBy,
  };
}

@Injectable()
export class SystemConfigService {
  private cache: SystemConfig | null = null;

  async getConfig(): Promise<SystemConfig> {
    if (this.cache) return this.cache;
    const doc = await SystemConfigModel.findOne({ singleton: "global" }).lean();
    this.cache = doc ? mapDoc(doc) : { ...defaults };
    return this.cache;
  }

  async saveConfig(config: Partial<SystemConfig>, updatedBy: string): Promise<SystemConfig> {
    this.cache = null; // invalidate cache
    const updated = await SystemConfigModel.findOneAndUpdate(
      { singleton: "global" },
      { ...config, updatedBy },
      { upsert: true, new: true }
    ).lean();
    return mapDoc(updated);
  }
}
