import { Controller, Get, Post, Body, UseGuards, Request } from "@nestjs/common";
import { NotifyConfigService } from "./notify-config.service";
import { JwtAuthGuard } from "../auth/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller("api/config")
export class NotifyConfigController {
  constructor(private readonly configService: NotifyConfigService) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Post()
  async saveConfig(@Body() body: any, @Request() req: any) {
    return this.configService.saveConfig(body, req.user?.login || "unknown");
  }
}
