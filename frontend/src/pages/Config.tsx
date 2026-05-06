import { useEffect, useState, useRef } from "react";
import moment from "moment";
import { Settings, Save, RefreshCw, Power, Clock, Bell, Calendar, User, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getConfig, saveConfig, getCalendarMonth } from "../api";
import type { NotifyConfig, CalendarEvent } from "../types";

function Toggle({
  checked,
  onChange,
  color = "bg-brand-500",
}: {
  checked: boolean;
  onChange: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? color : "bg-gray-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function Config() {
  const [config, setConfig] = useState<NotifyConfig>({
    enabled: false,
    sendBeforeMinutes: 30,
    sendAtDayStart: true,
    dayStartTime: "07:30",
    startShiftMessage: "",
    sendAtShiftEnd: false,
    endShiftMessage: "",
    activeDays: [1, 2, 3, 4, 5],
    ownerCalendarName: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarPeople, setCalendarPeople] = useState<{ displayName: string; githubLogin: string }[]>([]);
  const [matchedDates, setMatchedDates] = useState<CalendarEvent[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => toast.error("Không tải được cấu hình"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch danh sách người trong calendar tháng này (chỉ lấy ca trực, bỏ event không phải người)
  useEffect(() => {
    setLoadingPeople(true);
    const now = moment();
    getCalendarMonth(now.year(), now.month() + 1)
      .then((events: CalendarEvent[]) => {
        const seen = new Set<string>();
        const people: { displayName: string; githubLogin: string }[] = [];
        for (const e of events) {
          if (!e.githubLogin) continue; // bỏ event không phải ca trực
          if (seen.has(e.githubLogin)) continue;
          seen.add(e.githubLogin);
          people.push({ displayName: e.displayName || e.summary, githubLogin: e.githubLogin });
        }
        setCalendarPeople(people.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      })
      .catch(() => {})
      .finally(() => setLoadingPeople(false));
  }, []);

  // Khi chọn tên → hiển thị các ngày có ca
  useEffect(() => {
    const name = config.ownerCalendarName.trim();
    if (!name) { setMatchedDates([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const now = moment();
        const events: CalendarEvent[] = await getCalendarMonth(now.year(), now.month() + 1);
        setMatchedDates(events.filter(e => e.summary.toLowerCase().includes(name.toLowerCase())));
      } catch {
        setMatchedDates([]);
      }
    }, 300);
  }, [config.ownerCalendarName]);

  const handleSave = async () => {
    if (!config.ownerCalendarName.trim()) {
      toast.error("Vui lòng nhập GitHub Username");
      return;
    }
    setSaving(true);
    try {
      const updated = await saveConfig(config as unknown as Record<string, unknown>);
      setConfig(updated);
      toast.success("Đã lưu cấu hình");
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-gray-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-5 h-5 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-100">Cấu hình</h1>
      </div>

      <div className="space-y-3">

        {/* Tên trong calendar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Tên trong Google Calendar</h3>
            <span className="text-xs text-red-400">* bắt buộc</span>
            {loadingPeople && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
          </div>
          <select
            value={config.ownerCalendarName}
            onChange={(e) => setConfig((c) => ({ ...c, ownerCalendarName: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">-- Chọn tên của bạn --</option>
            {calendarPeople.map((p) => (
              <option key={p.githubLogin} value={p.displayName}>
                {p.displayName}
              </option>
            ))}
          </select>
          {config.ownerCalendarName && (
            <div>
              {matchedDates.length === 0 ? (
                <p className="text-xs text-yellow-500">Không tìm thấy ca nào trong tháng này</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {matchedDates.length} ca trong tháng này
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {matchedDates.map((e) => (
                      <span key={e.id} className="text-[11px] bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-0.5">
                        {moment(e.date).format("DD/MM")}
                        {e.startDateTime && ` ${moment(e.startDateTime).format("HH:mm")}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto send toggle */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${config.enabled ? "bg-green-500/15" : "bg-gray-800"}`}>
                <Power className={`w-4 h-4 ${config.enabled ? "text-green-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Tự động gửi</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {config.enabled ? "Scheduler đang chạy" : "Đang tắt"}
                </p>
              </div>
            </div>
            <Toggle
              checked={config.enabled}
              onChange={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
              color="bg-green-500"
            />
          </div>
        </div>

        {/* Active days */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Ngày gửi tự động</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "CN", value: 0 },
              { label: "T2", value: 1 },
              { label: "T3", value: 2 },
              { label: "T4", value: 3 },
              { label: "T5", value: 4 },
              { label: "T6", value: 5 },
              { label: "T7", value: 6 },
            ].map(({ label, value }) => {
              const active = config.activeDays.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      activeDays: active
                        ? c.activeDays.filter((d) => d !== value)
                        : [...c.activeDays, value].sort(),
                    }))
                  }
                  className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-brand-600/30 text-brand-400 border border-brand-500/40"
                      : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-600">Scheduler chỉ gửi vào các ngày được chọn.</p>
        </div>

        {/* Day start */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Gửi đầu ngày</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Bật thông báo đầu ngày</p>
              <p className="text-xs text-gray-500 mt-0.5">Gửi thông báo ca trực vào đầu ngày</p>
            </div>
            <Toggle
              checked={config.sendAtDayStart}
              onChange={() => setConfig((c) => ({ ...c, sendAtDayStart: !c.sendAtDayStart }))}
            />
          </div>

          {config.sendAtDayStart && (
            <div className="pt-1 border-t border-gray-800">
              <label className="text-xs text-gray-500 block mb-2">
                Giờ gửi (giờ Việt Nam)
              </label>
              <input
                type="time"
                value={config.dayStartTime}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, dayStartTime: e.target.value }))
                }
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 w-32"
              />
            </div>
          )}
        </div>

        {/* Before shift */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Nhắc trước ca</h3>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-500">
                Gửi trước giờ bắt đầu ca
              </label>
              <span className={`text-sm font-semibold tabular-nums ${config.sendBeforeMinutes === 0 ? "text-gray-500" : "text-brand-400"}`}>
                {config.sendBeforeMinutes === 0 ? "Tắt" : `${config.sendBeforeMinutes} phút`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              step={5}
              value={config.sendBeforeMinutes}
              onChange={(e) =>
                setConfig((c) => ({ ...c, sendBeforeMinutes: Number(e.target.value) }))
              }
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-gray-700"
            />
            <div className="flex justify-between text-[11px] text-gray-600 mt-1.5">
              <span>Tắt</span>
              <span>30 phút</span>
              <span>1 giờ</span>
              <span>2 giờ</span>
            </div>
          </div>
        </div>

        {/* Start shift message */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Tin nhắn đầu ca</h3>
          </div>
          <textarea
            value={config.startShiftMessage}
            onChange={(e) => setConfig((c) => ({ ...c, startShiftMessage: e.target.value }))}
            placeholder="Nhập nội dung tự động gửi lúc đầu ca..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* End shift */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${config.sendAtShiftEnd ? "bg-blue-500/15" : "bg-gray-800"}`}>
                <Bell className={`w-4 h-4 ${config.sendAtShiftEnd ? "text-blue-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Gửi cuối ca</p>
                <p className="text-xs text-gray-500 mt-0.5">Tự động gửi khi ca kết thúc</p>
              </div>
            </div>
            <Toggle
              checked={config.sendAtShiftEnd}
              onChange={() => setConfig((c) => ({ ...c, sendAtShiftEnd: !c.sendAtShiftEnd }))}
            />
          </div>
          {config.sendAtShiftEnd && (
            <textarea
              value={config.endShiftMessage}
              onChange={(e) => setConfig((c) => ({ ...c, endShiftMessage: e.target.value }))}
              placeholder="Nhập nội dung tự động gửi lúc cuối ca..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
            />
          )}
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Lưu cấu hình
          </button>

          {config.updatedBy && (
            <p className="text-xs text-gray-600">
              Cập nhật bởi <span className="text-gray-500">@{config.updatedBy}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
