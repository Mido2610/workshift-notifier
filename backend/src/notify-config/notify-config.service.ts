import { Injectable } from "@nestjs/common";
import { NotifyConfigModel } from "../models/notify-config.schema";

export const DEFAULT_MESSAGE_TEMPLATE = `🔔 <b>Thông báo lịch trực</b>
📅 Ngày: {date}
👤 Người trực: <b>{name}</b>
⏰ Ca: {time}

<i>Gửi tự động bởi Workshift Notifier</i>`;


export interface NotifyConfig {
  enabled: boolean;
  sendBeforeMinutes: number;
  sendAtDayStart: boolean;
  dayStartTime: string;
  messageTemplate: string;
  endShiftMessageTemplate: string;
  sendAtShiftEnd: boolean;
  activeDays: number[];
  ownerCalendarName: string;
  updatedBy?: string;
}

@Injectable()
export class NotifyConfigService {
  async getConfig(): Promise<NotifyConfig> {
    const doc = await NotifyConfigModel.findOne({ singleton: "global" }).lean();
    if (!doc) {
      return {
        enabled: false,
        sendBeforeMinutes: 30,
        sendAtDayStart: true,
        dayStartTime: "07:30",
        messageTemplate: "",
        endShiftMessageTemplate: "",
        sendAtShiftEnd: false,
        activeDays: [1, 2, 3, 4, 5],
        ownerCalendarName: "",
      };
    }
    return {
      enabled: doc.enabled,
      sendBeforeMinutes: doc.sendBeforeMinutes,
      sendAtDayStart: doc.sendAtDayStart,
      dayStartTime: doc.dayStartTime,
      messageTemplate: doc.messageTemplate || "",
      endShiftMessageTemplate: (doc as any).endShiftMessageTemplate || "",
      sendAtShiftEnd: (doc as any).sendAtShiftEnd ?? false,
      activeDays: (doc as any).activeDays ?? [1, 2, 3, 4, 5],
      ownerCalendarName: (doc as any).ownerCalendarName || "",
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
      messageTemplate: updated!.messageTemplate || "",
      endShiftMessageTemplate: (updated as any).endShiftMessageTemplate || "",
      sendAtShiftEnd: (updated as any).sendAtShiftEnd ?? false,
      activeDays: (updated as any).activeDays ?? [1, 2, 3, 4, 5],
      ownerCalendarName: (updated as any).ownerCalendarName || "",
      updatedBy: updated!.updatedBy,
    };
  }
}
