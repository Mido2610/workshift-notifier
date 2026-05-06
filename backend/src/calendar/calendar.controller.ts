import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CalendarService } from "./calendar.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import * as moment from "moment-timezone";
import { VIETNAM_TZ } from "../constants";

@UseGuards(JwtAuthGuard)
@Controller("api/calendar")
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /** GET /api/calendar/events?date=YYYY-MM-DD */
  @Get("events")
  async getEventsForDate(@Query("date") date?: string) {
    const target = date || moment.tz(VIETNAM_TZ).format("YYYY-MM-DD");
    const events = await this.calendarService.getEventsForDate(target);
    return { date: target, events };
  }

  /** GET /api/calendar/month?year=2025&month=5 */
  @Get("month")
  async getMonthEvents(
    @Query("year") year?: string,
    @Query("month") month?: string
  ) {
    const now = moment.tz(VIETNAM_TZ);
    const y = Number(year) || now.year();
    const m = Number(month) || now.month() + 1;
    const events = await this.calendarService.getEventsForMonth(y, m);
    return { year: y, month: m, events };
  }

  /** GET /api/calendar/people — danh sách tên duy nhất trong tháng hiện tại */
  @Get("people")
  async getPeople() {
    const now = moment.tz(VIETNAM_TZ);
    const events = await this.calendarService.getEventsForMonth(now.year(), now.month() + 1);
    const seen = new Set<string>();
    const people: { summary: string; displayName: string; githubLogin?: string }[] = [];
    for (const e of events) {
      const key = e.githubLogin || e.summary;
      if (seen.has(key)) continue;
      seen.add(key);
      people.push({ summary: e.summary, displayName: e.displayName || e.summary, githubLogin: e.githubLogin });
    }
    return people.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}
