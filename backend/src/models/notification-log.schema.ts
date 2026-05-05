import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    calendarEventId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    eventSummary: { type: String },
    githubLogin: { type: String },
    message: { type: String },
    triggerType: {
      type: String,
      enum: ["scheduler", "manual"],
      default: "scheduler",
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
    },
    sentAt: { type: Date, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

notificationLogSchema.index(
  { date: 1, calendarEventId: 1, triggerType: 1 },
  { unique: true }
);

const NotificationLogModel = mongoose.model(
  "NotificationLog",
  notificationLogSchema
);

export { NotificationLogModel };
