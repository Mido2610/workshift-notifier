import mongoose from "mongoose";

const telegramLinkSchema = new mongoose.Schema(
  {
    githubLogin: { type: String, required: true, unique: true },
    telegramChatId: { type: Number, required: true },
    telegramUsername: { type: String },
  },
  { timestamps: true }
);

const TelegramLinkModel = mongoose.model("TelegramLink", telegramLinkSchema);
export { TelegramLinkModel };
