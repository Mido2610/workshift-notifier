import moment from "moment";
import type { CalendarEvent } from "../types";

interface Props {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDayClick?: (date: string) => void;
}

export default function CalendarGrid({ year, month, events, onDayClick }: Props) {
  const startOfMonth = moment({ year, month: month - 1, day: 1 });
  const daysInMonth = startOfMonth.daysInMonth();
  const firstDow = startOfMonth.day(); // 0=Sun
  const today = moment().format("YYYY-MM-DD");

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-gray-500 py-2 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = moment({ year, month: month - 1, day }).format("YYYY-MM-DD");
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`relative min-h-[64px] p-1.5 rounded-lg border text-left transition-colors ${
                isToday
                  ? "border-brand-500/50 bg-brand-600/10"
                  : "border-gray-800 hover:border-gray-700 hover:bg-gray-800/50"
              }`}
            >
              <span
                className={`text-xs font-medium block mb-1 ${
                  isToday ? "text-brand-400" : "text-gray-400"
                }`}
              >
                {day}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className="text-[10px] bg-brand-600/20 text-brand-300 rounded px-1 py-0.5 truncate"
                    title={e.displayName || e.summary}
                  >
                    {e.displayName || e.summary}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-gray-500">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
