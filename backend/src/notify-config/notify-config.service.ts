import { Injectable } from "@nestjs/common";
import { NotifyConfigModel } from "../models/notify-config.schema";

export interface NotifyConfig {
  enabled: boolean;
  sendBeforeMinutes: number;
  sendAtDayStart: boolean;
  dayStartTime: string;
  startShiftMessage: string;
  endShiftMessage: string;
  activeDays: number[];
  ownerCalendarName: string;
  updatedBy?: string;
}

const defaults: NotifyConfig = {
  enabled: false,
  sendBeforeMinutes: 30,
  sendAtDayStart: true,
  dayStartTime: "07:30",
  startShiftMessage: "",
  endShiftMessage: "",
  activeDays: [1, 2, 3, 4, 5],
  ownerCalendarName: "",
};

function mapDoc(doc: any): NotifyConfig {
  return {
    enabled: doc.enabled ?? defaults.enabled,
    sendBeforeMinutes: doc.sendBeforeMinutes ?? defaults.sendBeforeMinutes,
    sendAtDayStart: doc.sendAtDayStart ?? defaults.sendAtDayStart,
    dayStartTime: doc.dayStartTime || defaults.dayStartTime,
    startShiftMessage: doc.startShiftMessage || "",
    endShiftMessage: doc.endShiftMessage || "",
    activeDays: doc.activeDays ?? defaults.activeDays,
    ownerCalendarName: doc.ownerCalendarName || "",
    updatedBy: doc.updatedBy,
  };
}

@Injectable()
export class NotifyConfigService {
  async getConfig(): Promise<NotifyConfig> {
    const doc = await NotifyConfigModel.findOne({ singleton: "global" }).lean();
    if (!doc) return { ...defaults };
    return mapDoc(doc);
  }

  async saveConfig(config: Partial<NotifyConfig>, updatedBy: string): Promise<NotifyConfig> {
    const updated = await NotifyConfigModel.findOneAndUpdate(
      { singleton: "global" },
      { ...config, updatedBy },
      { upsert: true, new: true }
    ).lean();
    return mapDoc(updated);
  }
}
