import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Telegraf, Context } from "telegraf";
import * as moment from "moment-timezone";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { ShiftLogModel } from "../models/shift-log.schema";
import { VIETNAM_TZ } from "../constants";

@Injectable()
export class ShiftBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShiftBotService.name);
  private bot: Telegraf | null = null;
  private anthropic: Anthropic | null = null;

  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";
  private readonly telegramChatId = process.env.TELEGRAM_CHAT_ID || "";

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn("TELEGRAM_BOT_TOKEN not set — ShiftBot disabled");
      return;
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    } else {
      this.logger.warn("ANTHROPIC_API_KEY not set — summary will be plain concat");
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();
    this.bot.launch();
    this.logger.log("✅ ShiftBot launched");
  }

  async onModuleDestroy() {
    this.bot?.stop("SIGTERM");
  }

  private setupHandlers() {
    if (!this.bot) return;

    this.bot.start((ctx) => {
      ctx.reply(
        "Xin chào! Tôi là bot ghi nhận ca trực.\n\n" +
        "Nhắn tin bất kỳ để ghi log trong ca.\n" +
        "Nhắn /endshift để kết thúc ca và gửi báo cáo."
      );
    });

    this.bot.command("endshift", (ctx) => this.handleEndShift(ctx));

    // Mọi tin nhắn thường → lưu vào log
    this.bot.on("text", (ctx) => this.handleMessage(ctx));
  }

  private async handleMessage(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const userId = ctx.from!.id;
    const username = ctx.from!.username || ctx.from!.first_name || String(userId);
    const today = moment.tz(VIETNAM_TZ).format("YYYY-MM-DD");

    await ShiftLogModel.findOneAndUpdate(
      { telegramUserId: userId, date: today, status: "active" },
      {
        $setOnInsert: { telegramUserId: userId, telegramUsername: username, date: today },
        $push: { messages: { text, receivedAt: new Date() } },
      },
      { upsert: true, new: true }
    );

    await ctx.react("👍").catch(() => ctx.reply("✅ Đã ghi nhận"));
  }

  private async handleEndShift(ctx: Context) {
    const userId = ctx.from!.id;
    const username = ctx.from!.username || ctx.from!.first_name || String(userId);
    const today = moment.tz(VIETNAM_TZ).format("YYYY-MM-DD");

    const log = await ShiftLogModel.findOne({ telegramUserId: userId, date: today, status: "active" });

    if (!log || log.messages.length === 0) {
      return ctx.reply("Không có log nào trong ca hôm nay.");
    }

    await ctx.reply("⏳ Đang tổng hợp ca trực...");

    const summary = await this.generateSummary(username, log.messages.map((m: any) => m.text));

    await ShiftLogModel.findByIdAndUpdate(log._id, { status: "closed", summary });

    // Gửi lên channel
    await this.sendToChannel(username, summary);

    await ctx.reply(`✅ Đã gửi báo cáo kết ca:\n\n${summary}`);
    this.logger.log(`[ShiftBot] End-shift sent for @${username}`);
  }

  private async generateSummary(username: string, messages: string[]): Promise<string> {
    const header = `${username} Kết thúc ca trực`;
    const rawList = messages.map((m, i) => `${i + 1}. ${m}`).join("\n");

    if (!this.anthropic) {
      // Không có AI — ghép thẳng
      return `${header}\n${messages.join("\n")}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content:
              `Bạn là trợ lý tổng hợp báo cáo ca trực CSKH. ` +
              `Dưới đây là các ghi chú trong ca của nhân viên ${username}:\n\n${rawList}\n\n` +
              `Hãy tổng hợp thành báo cáo kết ca ngắn gọn, giữ nguyên tên khách hàng và link nếu có. ` +
              `Định dạng:\n${header}\n` +
              `A [Tên KH] - [nội dung ngắn gọn]\n...` +
              `\nChỉ trả về nội dung báo cáo, không giải thích thêm.`,
          },
        ],
      });
      return (response.content[0] as any).text?.trim() || `${header}\n${messages.join("\n")}`;
    } catch (err: any) {
      this.logger.error("Claude summary error:", err.message);
      return `${header}\n${messages.join("\n")}`;
    }
  }

  private async sendToChannel(username: string, summary: string): Promise<void> {
    await Promise.all([
      this.slackWebhookUrl
        ? axios.post(this.slackWebhookUrl, { text: summary })
        : Promise.resolve(),
      this.telegramChatId
        ? axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            { chat_id: this.telegramChatId, text: summary }
          )
        : Promise.resolve(),
    ]);
  }
}
