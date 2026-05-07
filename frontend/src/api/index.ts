import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------- Auth ----------
export const getMe = () => api.get("/api/auth/me").then((r) => r.data);

// ---------- Calendar ----------
export const getCalendarMonth = (year: number, month: number) =>
  api.get(`/api/calendar/month?year=${year}&month=${month}`).then((r) => r.data);

export const getCalendarPeople = () =>
  api.get("/api/calendar/people").then((r) => r.data);

export const getCalendarDay = (date: string) =>
  api.get(`/api/calendar/events?date=${date}`).then((r) => r.data);

// ---------- Notification ----------
export const sendMessage = (message: string) =>
  api.post("/api/notification/send-message", { message }).then((r) => r.data);

export const getLogs = (page = 1, limit = 20) =>
  api.get(`/api/notification/logs?page=${page}&limit=${limit}`).then((r) => r.data);

export const getStats = () =>
  api.get("/api/notification/stats").then((r) => r.data);

// ---------- User Config ----------
export const getConfig = () => api.get("/api/config").then((r) => r.data);

export const getTelegramLinkStatus = () =>
  api.get("/api/config/telegram-link").then((r) => r.data as { linked: boolean; telegramUsername: string | null });

export const saveConfig = (data: Record<string, unknown>) =>
  api.post("/api/config", data).then((r) => r.data);

// ---------- System Config ----------
export const getSystemConfig = () => api.get("/api/system-config").then((r) => r.data);

export const saveSystemConfig = (data: Record<string, unknown>) =>
  api.post("/api/system-config", data).then((r) => r.data);
