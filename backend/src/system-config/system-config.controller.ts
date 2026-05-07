import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SystemConfigService } from "./system-config.service";

const ADMINS = (process.env.ADMIN_GITHUB_LOGINS || "Mido2610")
  .split(",")
  .map((s) => s.trim().toLowerCase());

@UseGuards(JwtAuthGuard)
@Controller("api/system-config")
export class SystemConfigController {
  constructor(private readonly service: SystemConfigService) {}

  @Get()
  getConfig() {
    return this.service.getConfig();
  }

  @Post()
  saveConfig(@Body() body: Record<string, unknown>, @Request() req: any) {
    const login: string = req.user?.login || "";
    if (!ADMINS.includes(login.toLowerCase())) {
      throw new ForbiddenException("Admin only");
    }
    return this.service.saveConfig(body as any, login);
  }
}
