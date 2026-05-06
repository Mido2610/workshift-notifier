import { useEffect, useState, useCallback } from "react";
import moment from "moment";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import CalendarGrid from "../components/CalendarGrid";
import { getCalendarMonth, getCalendarDay, getStats, sendMessage } from "../api";
import type { CalendarEvent, Stats } from "../types";

export default function Dashboard() {
  const [year, setYear] = useState(moment().year());
  const [month, setMonth] = useState(moment().month() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingCal, setLoadingCal] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );

  const loadMonth = useCallback(async () => {
    setLoadingCal(true);
    try {
      const data = await getCalendarMonth(year, month);
      setEvents(data.events || []);
    } catch {
      toast.error("Không tải được lịch");
    } finally {
      setLoadingCal(false);
    }
  }, [year, month]);

  const loadToday = useCallback(async () => {
    const today = moment().format("YYYY-MM-DD");
    const data = await getCalendarDay(today);
    setTodayEvents(data.events || []);
  }, []);

  const loadStats = useCallback(async () => {
    const s = await getStats();
    setStats(s);
  }, []);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadToday();
    loadStats();
  }, [loadToday, loadStats]);

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Vui lòng nhập nội dung"); return; }
    setSending(true);
    try {
      await sendMessage(message.trim());
      toast.success("Đã gửi lên Slack + Telegram");
      setMessage("");
      loadStats();
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const selectedEvents = events.filter(e => e.date === selectedDate);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {moment().format("dddd, DD/MM/YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 w-60"
          />
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Gửi
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Đã gửi", value: stats.sent, icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Thất bại", value: stats.failed, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "Tổng", value: stats.total, icon: Clock, color: "text-gray-400", bg: "bg-gray-400/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar — full width */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-100">
            {moment({ year, month: month - 1 }).format("MMMM YYYY")}
          </h2>
          <div className="flex items-center gap-1">
            {loadingCal && <RefreshCw className="w-4 h-4 text-gray-500 animate-spin mr-2" />}
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <CalendarGrid
          year={year}
          month={month}
          events={events}
          onDayClick={setSelectedDate}
        />
      </div>

      {/* Bottom row: Today + Selected day */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's shifts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="font-medium text-gray-200">Trực hôm nay</h3>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-gray-600">Không có ca trực hôm nay</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <div key={e.id} className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-200">
                    {e.displayName || e.summary}
                  </p>
                  {e.startDateTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      {moment(e.startDateTime).format("HH:mm")} –{" "}
                      {moment(e.endDateTime).format("HH:mm")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected day */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center mb-4">
            <h3 className="font-medium text-gray-200">
              {selectedDate === moment().format("YYYY-MM-DD")
                ? "Hôm nay"
                : moment(selectedDate).format("dddd, DD/MM")}
            </h3>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-600">Không có ca trực</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <div key={e.id} className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-200">
                    {e.displayName || e.summary}
                  </p>
                  {e.startDateTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      {moment(e.startDateTime).format("HH:mm")} –{" "}
                      {moment(e.endDateTime).format("HH:mm")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
