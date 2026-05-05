import { Injectable, OnModuleInit } from "@nestjs/common";
import { google, calendar_v3 } from "googleapis";
import * as moment from "moment-timezone";
import { resolveGithubLoginByName, USER_FULL_NAMES, VIETNAM_TZ } from "../constants";

export interface CalendarEvent {
  id: string;
  summary: string;
  date: string; // YYYY-MM-DD
  startDateTime?: string;
  endDateTime?: string;
  allDay: boolean;
  githubLogin?: string;
  displayName?: string;
}

@Injectable()
export class CalendarService implements OnModuleInit {
  private calendarClient: calendar_v3.Calendar;

  private readonly calendarId =
    process.env.GOOGLE_CALENDAR_ID ||
    "c_93cae9ea9243fc7eb329137b547c18329f7de8069d5064dace1aaeb66df6eab6@group.calendar.google.com";

  onModuleInit() {
    this.calendarClient = this.buildClient();
  }

  private buildClient(): calendar_v3.Calendar {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      });
      return google.calendar({ version: "v3", auth });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      return google.calendar({ version: "v3", auth: apiKey });
    }

    throw new Error(
      "Thiếu Google Calendar credentials. Cần GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_API_KEY."
    );
  }

  async getEventsForDate(date: string): Promise<CalendarEvent[]> {
    const timeMin = moment.tz(date, VIETNAM_TZ).startOf("day").toISOString();
    const timeMax = moment.tz(date, VIETNAM_TZ).endOf("day").toISOString();
    return this.fetchEvents(timeMin, timeMax);
  }

  async getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
    const start = moment.tz({ year, month: month - 1, day: 1 }, VIETNAM_TZ);
    const timeMin = start.startOf("month").toISOString();
    const timeMax = start.clone().endOf("month").toISOString();
    return this.fetchEvents(timeMin, timeMax);
  }

  private async fetchEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
    const response = await this.calendarClient.events.list({
      calendarId: this.calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 200,
    });

    return (response.data.items || []).map((e) => this.mapEvent(e));
  }

  private mapEvent(e: calendar_v3.Schema$Event): CalendarEvent {
    const allDay = !!e.start?.date;
    const date = allDay
      ? e.start!.date!
      : moment.tz(e.start?.dateTime!, VIETNAM_TZ).format("YYYY-MM-DD");

    const summary = e.summary || "";
    const githubLogin = resolveGithubLoginByName(summary);
    const displayName = githubLogin
      ? (USER_FULL_NAMES[githubLogin] || githubLogin)
      : summary;

    return {
      id: e.id!,
      summary,
      date,
      allDay,
      startDateTime: e.start?.dateTime || undefined,
      endDateTime: e.end?.dateTime || undefined,
      githubLogin,
      displayName,
    };
  }
}
