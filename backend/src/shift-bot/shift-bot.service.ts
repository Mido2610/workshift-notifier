import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Telegraf, Context, Markup } from "telegraf";
import * as moment from "moment-timezone";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { ShiftLogModel } from "../models/shift-log.schema";
import { TelegramLinkModel } from "../models/telegram-link.schema";
import { VIETNAM_TZ } from "../constants";
import { buildEndShiftPrompt } from "./shift-bot.prompt";

@Injectable()
export class ShiftBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShiftBotService.name);
  private bot: Telegraf | null = null;
  private anthropic: Anthropic | null = null;

  // userId → pending summary (chờ confirm)
  private pendingPreview = new Map<number, string>();

  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";
  private readonly telegramChatId = process.env.TELEGRAM_CHAT_ID || "";

  onModuleInit() {
    const token = process.env.SHIFT_BOT_TOKEN;
    if (!token) {
      this.logger.warn("SHIFT_BOT_TOKEN not set — ShiftBot disabled");
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
    this.bot.catch((err: any) => {
      this.logger.error(`[ShiftBot] Handler error: ${err?.message}`);
    });
    this.launchWithRetry();
    this.logger.log("✅ ShiftBot launched");
  }

  async onModuleDestroy() {
    this.bot?.stop("SIGTERM");
  }

  // ─── Launch with retry on 409 ──────────────────────────────────────────────

  private async launchWithRetry(attempt = 1) {
    try {
      await this.bot!.telegram.deleteWebhook({ drop_pending_updates: true });
      this.logger.log("[ShiftBot] Webhook cleared");
    } catch (err: any) {
      this.logger.warn(`[ShiftBot] deleteWebhook error: ${err?.message}`);
    }

    this.bot!.launch({ dropPendingUpdates: true }).catch((err: any) => {
      if (err?.response?.error_code === 409) {
        const delay = Math.min(30000 * attempt, 120000);
        this.logger.warn(`[ShiftBot] 409 conflict — retry in ${delay / 1000}s (attempt ${attempt})`);
        setTimeout(() => this.launchWithRetry(attempt + 1), delay);
      } else {
        this.logger.error(`[ShiftBot] Launch error: ${err?.message}`);
      }
    });
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  private setupHandlers() {
    if (!this.bot) return;

    this.bot.start((ctx) =>
      ctx.reply(
        "👋 Xin chào! Tôi là ShiftBot — ghi nhận ca trực của bạn.\n\n" +
        "📝 *Lệnh có sẵn:*\n" +
        "/log \\[nội dung\\] — Thêm ghi chú\n" +
        "/mylogs — Xem danh sách log hôm nay\n" +
        "/editlog \\[số\\] \\[nội dung mới\\] — Sửa log\n" +
        "/deletelog \\[số\\] — Xóa log\n" +
        "/endshift — Xem preview báo cáo kết ca\n" +
        "/link \\[github\\_username\\] — Liên kết để nhận thông báo ca trực\n" +
        "/unlink — Hủy liên kết",
        { parse_mode: "MarkdownV2" }
      )
    );

    this.bot.help((ctx) =>
      ctx.reply(
        "📋 *Danh sách lệnh:*\n\n" +
        "➕ /log A Khách — Nhờ check task X\n" +
        "📋 /mylogs — Xem toàn bộ log hôm nay\n" +
        "✏️ /editlog 2 A Khách — Đã xử lý\n" +
        "🗑 /deletelog 2 — Xóa log số 2\n" +
        "📤 /endshift — Preview & gửi báo cáo kết ca",
        { parse_mode: "Markdown" }
      )
    );

    this.bot.command("log", (ctx) => this.handleLog(ctx));
    this.bot.command("mylogs", (ctx) => this.handleMyLogs(ctx));
    this.bot.command("editlog", (ctx) => this.handleEditLog(ctx));
    this.bot.command("deletelog", (ctx) => this.handleDeleteLog(ctx));
    this.bot.command("endshift", (ctx) => this.handleEndShift(ctx));
    this.bot.command("link", (ctx) => this.handleLink(ctx));
    this.bot.command("unlink", (ctx) => this.handleUnlink(ctx));

    // Inline button: Gửi / Hủy
    this.bot.action("confirm_send", (ctx) => this.handleConfirm(ctx));
    this.bot.action("cancel_send", (ctx) => this.handleCancel(ctx));

    // Tin nhắn thường → lưu log
    this.bot.on("text", (ctx) => this.handleFreeText(ctx));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private userId(ctx: Context) {
    return ctx.from!.id;
  }

  private username(ctx: Context) {
    return ctx.from!.username || ctx.from!.first_name || String(ctx.from!.id);
  }

  private today() {
    return moment.tz(VIETNAM_TZ).format("YYYY-MM-DD");
  }

  private async getActiveLog(userId: number) {
    return ShiftLogModel.findOne({ telegramUserId: userId, date: this.today(), status: "active" });
  }

  private async ensureLog(userId: number, username: string) {
    return ShiftLogModel.findOneAndUpdate(
      { telegramUserId: userId, date: this.today(), status: "active" },
      { $setOnInsert: { telegramUserId: userId, telegramUsername: username, date: this.today(), messages: [] } },
      { upsert: true, new: true }
    );
  }

  // ─── /log ──────────────────────────────────────────────────────────────────

  private async handleLog(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const text = ctx.message.text.replace(/^\/log\s*/i, "").trim();
    if (!text) return ctx.reply("Cú pháp: /log A Khách — Hỏi về...");

    const uid = this.userId(ctx);
    const log = await this.ensureLog(uid, this.username(ctx));
    log.messages.push({ text, receivedAt: new Date() } as any);
    await log.save();

    const idx = log.messages.length;
    await ctx.reply(`✅ Đã lưu log #${idx}: ${text}`);
  }

  // ─── Text thường ───────────────────────────────────────────────────────────

  private async handleFreeText(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const text = (ctx.message as any).text as string;
    if (text.startsWith("/")) return;

    const uid = this.userId(ctx);
    const log = await this.ensureLog(uid, this.username(ctx));
    log.messages.push({ text, receivedAt: new Date() } as any);
    await log.save();

    await ctx.react("👍").catch(() => ctx.reply(`✅ Log #${log.messages.length} đã lưu`));
  }

  // ─── /mylogs ───────────────────────────────────────────────────────────────

  private async handleMyLogs(ctx: Context) {
    const log = await this.getActiveLog(this.userId(ctx));
    if (!log || log.messages.length === 0) {
      return ctx.reply("📭 Chưa có log nào hôm nay.");
    }
    const lines = log.messages.map((m: any, i: number) => `${i + 1}. ${m.text}`).join("\n");
    await ctx.reply(`📋 *Log ca hôm nay (${log.messages.length}):*\n\n${lines}`, { parse_mode: "Markdown" });
  }

  // ─── /editlog ──────────────────────────────────────────────────────────────

  private async handleEditLog(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const parts = ctx.message.text.replace(/^\/editlog\s*/i, "").trim();
    const match = parts.match(/^(\d+)\s+(.+)$/s);
    if (!match) return ctx.reply("Cú pháp: /editlog 2 Nội dung mới");

    const idx = parseInt(match[1]) - 1;
    const newText = match[2].trim();
    const log = await this.getActiveLog(this.userId(ctx));
    if (!log) return ctx.reply("Chưa có log nào hôm nay.");
    if (idx < 0 || idx >= log.messages.length) return ctx.reply(`Không tìm thấy log #${idx + 1}`);

    log.messages[idx].text = newText;
    log.markModified("messages");
    await log.save();
    await ctx.reply(`✏️ Đã sửa log #${idx + 1}: ${newText}`);
  }

  // ─── /link ─────────────────────────────────────────────────────────────────

  private async handleLink(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const githubLogin = ctx.message.text.replace(/^\/link\s*/i, "").trim();
    if (!githubLogin) {
      return ctx.reply("Cú pháp: /link <github_username>\nVí dụ: /link Mido2610");
    }

    const chatId = this.userId(ctx);
    const username = this.username(ctx);

    await TelegramLinkModel.findOneAndUpdate(
      { githubLogin },
      { githubLogin, telegramChatId: chatId, telegramUsername: username },
      { upsert: true, new: true }
    );

    await ctx.reply(
      `✅ Đã liên kết Telegram của bạn với GitHub \`${githubLogin}\`.\n` +
      `Từ nay các thông báo ca trực sẽ được gửi trực tiếp vào chat này.`,
      { parse_mode: "Markdown" }
    );
  }

  // ─── /unlink ───────────────────────────────────────────────────────────────

  private async handleUnlink(ctx: Context) {
    const chatId = this.userId(ctx);
    const deleted = await TelegramLinkModel.findOneAndDelete({ telegramChatId: chatId });
    if (deleted) {
      await ctx.reply(`✅ Đã hủy liên kết với GitHub \`${deleted.githubLogin}\`.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("Bạn chưa liên kết tài khoản GitHub nào.");
    }
  }

  // ─── /deletelog ────────────────────────────────────────────────────────────

  private async handleDeleteLog(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;
    const parts = ctx.message.text.replace(/^\/deletelog\s*/i, "").trim();
    const idx = parseInt(parts) - 1;
    if (isNaN(idx)) return ctx.reply("Cú pháp: /deletelog 2");

    const log = await this.getActiveLog(this.userId(ctx));
    if (!log) return ctx.reply("Chưa có log nào hôm nay.");
    if (idx < 0 || idx >= log.messages.length) return ctx.reply(`Không tìm thấy log #${idx + 1}`);

    const removed = log.messages[idx].text;
    log.messages.splice(idx, 1);
    log.markModified("messages");
    await log.save();
    await ctx.reply(`🗑 Đã xóa log #${idx + 1}: ${removed}`);
  }

  // ─── /endshift → preview ───────────────────────────────────────────────────

  private async handleEndShift(ctx: Context) {
    const uid = this.userId(ctx);
    const log = await this.getActiveLog(uid);
    if (!log || log.messages.length === 0) {
      return ctx.reply("📭 Không có log nào trong ca hôm nay.");
    }

    await ctx.reply("⏳ Đang tổng hợp...");

    const username = this.username(ctx);
    const summary = await this.generateSummary(username, log.messages.map((m: any) => m.text));

    // Lưu preview để dùng khi confirm
    this.pendingPreview.set(uid, summary);

    await ctx.reply(
      `📋 *Preview báo cáo kết ca:*\n\n${summary}\n\n` +
      `Xác nhận gửi lên channel?`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("✅ Gửi", "confirm_send"),
          Markup.button.callback("❌ Hủy", "cancel_send"),
        ]),
      }
    );
  }

  // ─── Inline confirm / cancel ───────────────────────────────────────────────

  private async handleConfirm(ctx: Context) {
    const uid = this.userId(ctx);
    const summary = this.pendingPreview.get(uid);
    if (!summary) return ctx.answerCbQuery("Không có báo cáo pending.");

    this.pendingPreview.delete(uid);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const log = await this.getActiveLog(uid);
    if (log) {
      await ShiftLogModel.findByIdAndUpdate(log._id, { status: "closed", summary });
    }

    await this.sendToChannel(summary);
    await ctx.reply("✅ Đã gửi báo cáo lên channel!");
    this.logger.log(`[ShiftBot] End-shift confirmed by @${this.username(ctx)}`);
  }

  private async handleCancel(ctx: Context) {
    const uid = this.userId(ctx);
    this.pendingPreview.delete(uid);
    await ctx.answerCbQuery("Đã hủy.");
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply("❌ Đã hủy. Bạn có thể /editlog, /deletelog rồi /endshift lại.");
  }

  // ─── AI Summary ────────────────────────────────────────────────────────────

  private async generateSummary(username: string, messages: string[]): Promise<string> {
    const header = `${username} Kết thúc ca trực`;

    if (!this.anthropic) {
      return `${header}\n${messages.join("\n")}`;
    }
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: buildEndShiftPrompt(username, messages) }],
      });
      return (response.content[0] as any).text?.trim() || `${header}\n${messages.join("\n")}`;
    } catch (err: any) {
      this.logger.error("Claude error:", err.message);
      return `${header}\n${messages.join("\n")}`;
    }
  }

  // ─── Send to channel ───────────────────────────────────────────────────────

  private async sendToChannel(summary: string): Promise<void> {
    await Promise.all([
      this.slackWebhookUrl
        ? axios.post(this.slackWebhookUrl, { text: summary })
        : Promise.resolve(),
      this.telegramChatId
        ? axios.post(
            `https://api.telegram.org/bot${process.env.SHIFT_BOT_TOKEN}/sendMessage`,
            { chat_id: this.telegramChatId, text: summary }
          )
        : Promise.resolve(),
    ]);
  }
}
