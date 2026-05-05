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
      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-2 font-semibold tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = moment({ year, month: month - 1, day }).format("YYYY-MM-DD");
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`relative min-h-[90px] p-2 rounded-xl border text-left transition-all ${
                isToday
                  ? "border-brand-500/60 bg-brand-600/10 shadow-sm shadow-brand-500/10"
                  : "border-gray-800 hover:border-gray-600 hover:bg-gray-800/60"
              }`}
            >
              <span
                className={`text-sm font-semibold block mb-1.5 ${
                  isToday
                    ? "text-brand-400"
                    : "text-gray-300"
                }`}
              >
                {day}
              </span>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="text-xs bg-brand-600/25 text-brand-200 rounded-md px-1.5 py-1 truncate font-medium leading-tight"
                    title={e.displayName || e.summary}
                  >
                    {e.displayName || e.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-gray-500 pl-0.5">
                    +{dayEvents.length - 3}
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
