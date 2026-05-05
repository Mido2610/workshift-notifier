import { Injectable } from "@nestjs/common";
import { NotifyConfigModel } from "../models/notify-config.schema";

export interface NotifyConfig {
  enabled: boolean;
  sendBeforeMinutes: number;
  sendAtDayStart: boolean;
  dayStartTime: string;
  updatedBy?: string;
}

@Injectable()
export class NotifyConfigService {
  async getConfig(): Promise<NotifyConfig> {
    const doc = await NotifyConfigModel.findOne({ singleton: "global" }).lean();
    if (!doc) {
      return {
        enabled: true,
        sendBeforeMinutes: 30,
        sendAtDayStart: true,
        dayStartTime: "07:30",
      };
    }
    return {
      enabled: doc.enabled,
      sendBeforeMinutes: doc.sendBeforeMinutes,
      sendAtDayStart: doc.sendAtDayStart,
      dayStartTime: doc.dayStartTime,
      updatedBy: doc.updatedBy,
    };
  }

  async saveConfig(
    config: Partial<NotifyConfig>,
    updatedBy: string
  ): Promise<NotifyConfig> {
    const updated = await NotifyConfigModel.findOneAndUpdate(
      { singleton: "global" },
      { ...config, updatedBy },
      { upsert: true, new: true }
    ).lean();
    return {
      enabled: updated!.enabled,
      sendBeforeMinutes: updated!.sendBeforeMinutes,
      sendAtDayStart: updated!.sendAtDayStart,
      dayStartTime: updated!.dayStartTime,
      updatedBy: updated!.updatedBy,
    };
  }
}
