import mongoose from "mongoose";

const notifyConfigSchema = new mongoose.Schema(
  {
    // singleton – luôn chỉ có 1 bản ghi config
    singleton: { type: String, default: "global", unique: true },
    enabled: { type: Boolean, default: true },
    // Gửi trước ca bao nhiêu phút (0 = gửi đúng giờ bắt đầu)
    sendBeforeMinutes: { type: Number, default: 30 },
    // Gửi thông báo đầu ngày
    sendAtDayStart: { type: Boolean, default: true },
    // Giờ gửi đầu ngày (HH:MM, giờ Việt Nam)
    dayStartTime: { type: String, default: "07:30" },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const NotifyConfigModel = mongoose.model("NotifyConfig", notifyConfigSchema);

export { NotifyConfigModel };
