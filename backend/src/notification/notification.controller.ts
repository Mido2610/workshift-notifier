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
import { CalendarService } from "../calendar/calendar.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import * as moment from "moment-timezone";
import { VIETNAM_TZ } from "../constants";

@UseGuards(JwtAuthGuard)
@Controller("api/notification")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly calendarService: CalendarService
  ) {}

  /** POST /api/notification/send-now  { date?: "YYYY-MM-DD" } */
  @Post("send-now")
  async sendNow(@Body() body: { date?: string }, @Request() req: any) {
    const date = body.date || moment.tz(VIETNAM_TZ).format("YYYY-MM-DD");
    const events = await this.calendarService.getEventsForDate(date);

    const results = await Promise.all(
      events.map((event) =>
        this.notificationService.sendForEvent(event, "manual")
      )
    );

    const sent = results.filter((r) => r.sent).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => r.error).length;

    return { date, total: events.length, sent, skipped, failed };
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
