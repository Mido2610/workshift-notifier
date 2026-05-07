import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "global", unique: true },
    calendarId: { type: String, default: "" },
    slackWebhookUrl: { type: String, default: "" },
    telegramChatId: { type: String, default: "" },
    timezone: { type: String, default: "Asia/Ho_Chi_Minh" },
    defaultStartMessage: { type: String, default: "" },
    defaultEndMessage: { type: String, default: "" },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const SystemConfigModel = mongoose.model("SystemConfig", systemConfigSchema);
export { SystemConfigModel };
