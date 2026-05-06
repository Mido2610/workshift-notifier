import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller("api/notification")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /** POST /api/notification/send-message  { message: string } */
  @Post("send-message")
  async sendMessage(@Body() body: { message: string }, @Request() req: any) {
    return this.notificationService.sendMessage(req.user.login, body.message);
  }

  /** GET /api/notification/logs?page=1&limit=20 */
  @Get("logs")
  async getLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.notificationService.getLogs(
      Number(page) || 1,
      Number(limit) || 20
    );
  }

  /** GET /api/notification/stats */
  @Get("stats")
  async getStats() {
    return this.notificationService.getStats();
  }
}
