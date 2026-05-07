import { Controller, Get, Post, Body, UseGuards, Request } from "@nestjs/common";
import { NotifyConfigService } from "./notify-config.service";
import { TelegramLinkModel } from "../models/telegram-link.schema";
import { JwtAuthGuard } from "../auth/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller("api/config")
export class NotifyConfigController {
  constructor(private readonly configService: NotifyConfigService) {}

  @Get()
  getConfig(@Request() req: any) {
    return this.configService.getConfig(req.user.login);
  }

  @Post()
  saveConfig(@Body() body: any, @Request() req: any) {
    return this.configService.saveConfig(req.user.login, body);
  }

  @Get("telegram-link")
  async getTelegramLink(@Request() req: any) {
    const link = await TelegramLinkModel.findOne({ githubLogin: req.user.login }).lean();
    return { linked: !!link, telegramUsername: link?.telegramUsername || null };
  }
}
