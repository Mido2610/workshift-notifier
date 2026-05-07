import { Injectable } from "@nestjs/common";
import { NotifyConfigModel } from "../models/notify-config.schema";

export interface NotifyConfig {
  githubLogin: string;
  enabled: boolean;
  sendBeforeMinutes: number;
  sendAtDayStart: boolean;
  dayStartTime: string;
  dayEndTime: string;
  startShiftMessage: string;
  endShiftMessage: string;
  activeDays: number[];
  ownerCalendarName: string;
  updatedBy?: string;
}

const defaults = (githubLogin: string): NotifyConfig => ({
  githubLogin,
  enabled: false,
  sendBeforeMinutes: 30,
  sendAtDayStart: true,
  dayStartTime: "07:30",
  dayEndTime: "",
  startShiftMessage: "",
  endShiftMessage: "",
  activeDays: [1, 2, 3, 4, 5],
  ownerCalendarName: "",
});

function mapDoc(doc: any): NotifyConfig {
  return {
    githubLogin: doc.githubLogin,
    enabled: doc.enabled ?? false,
    sendBeforeMinutes: doc.sendBeforeMinutes ?? 30,
    sendAtDayStart: doc.sendAtDayStart ?? true,
    dayStartTime: doc.dayStartTime || "07:30",
    dayEndTime: doc.dayEndTime || "",
    startShiftMessage: doc.startShiftMessage || "",
    endShiftMessage: doc.endShiftMessage || "",
    activeDays: doc.activeDays ?? [1, 2, 3, 4, 5],
    ownerCalendarName: doc.ownerCalendarName || "",
    updatedBy: doc.updatedBy,
  };
}

@Injectable()
export class NotifyConfigService {
  async getConfig(githubLogin: string): Promise<NotifyConfig> {
    const doc = await NotifyConfigModel.findOne({ githubLogin }).lean();
    return doc ? mapDoc(doc) : defaults(githubLogin);
  }

  async saveConfig(githubLogin: string, config: Partial<NotifyConfig>): Promise<NotifyConfig> {
    const updated = await NotifyConfigModel.findOneAndUpdate(
      { githubLogin },
      { ...config, githubLogin, updatedBy: githubLogin },
      { upsert: true, new: true }
    ).lean();
    return mapDoc(updated);
  }

  /** Lấy tất cả config của user đang bật scheduler — dùng cho scheduler */
  async getAllEnabled(): Promise<NotifyConfig[]> {
    const docs = await NotifyConfigModel.find({ enabled: true }).lean();
    return docs.map(mapDoc);
  }
}
