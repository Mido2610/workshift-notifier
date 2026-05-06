export interface User {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  allDay: boolean;
  githubLogin?: string;
  displayName?: string;
}

export interface NotificationLog {
  _id: string;
  calendarEventId: string;
  date: string;
  eventSummary: string;
  githubLogin: string;
  message: string;
  triggerType: "scheduler" | "manual";
  status: "sent" | "failed";
  sentAt: string;
  errorMessage?: string;
}

export interface NotifyConfig {
  enabled: boolean;
  sendBeforeMinutes: number;
  sendAtDayStart: boolean;
  dayStartTime: string;
  startShiftMessage: string;
  endShiftMessage: string;
  activeDays: number[];
  ownerCalendarName: string;
  updatedBy?: string;
}

export interface Stats {
  sent: number;
  failed: number;
  total: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
