import mongoose from "mongoose";

const shiftLogSchema = new mongoose.Schema(
  {
    telegramUserId: { type: Number, required: true },
    telegramUsername: { type: String },
    date: { type: String, required: true }, // YYYY-MM-DD
    messages: [
      {
        text: { type: String, required: true },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
    summary: { type: String },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

const ShiftLogModel = mongoose.model("ShiftLog", shiftLogSchema);
export { ShiftLogModel };
