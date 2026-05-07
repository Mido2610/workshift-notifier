import mongoose from "mongoose";

const notifyConfigSchema = new mongoose.Schema(
  {
    // mỗi user có 1 config riêng, key là githubLogin
    githubLogin: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    // Gửi trước ca bao nhiêu phút (0 = gửi đúng giờ bắt đầu)
    sendBeforeMinutes: { type: Number, default: 30 },
    // Gửi thông báo đầu ngày
    sendAtDayStart: { type: Boolean, default: true },
    // Giờ gửi đầu ngày (HH:MM, giờ Việt Nam)
    dayStartTime: { type: String, default: "07:30" },
    // Giờ gửi cuối ca cố định (HH:MM, giờ Việt Nam)
    dayEndTime: { type: String, default: "" },
    // Template tin nhắn — hỗ trợ biến: {name} {date} {time} {summary}
    messageTemplate: { type: String, default: "" },
    // Template tin nhắn cuối ca
    endShiftMessageTemplate: { type: String, default: "" },
    // Tin nhắn tự động đầu ca
    startShiftMessage: { type: String, default: "" },
    // Tin nhắn tự động cuối ca
    endShiftMessage: { type: String, default: "" },
    // Ngày trong tuần được phép gửi (0=CN, 1=T2, ..., 6=T7)
    activeDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    // Tên trong Google Calendar — scheduler chỉ gửi khi tên này có trong event
    ownerCalendarName: { type: String, default: "" },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const NotifyConfigModel = mongoose.model("NotifyConfig", notifyConfigSchema);

export { NotifyConfigModel };
