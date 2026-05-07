import { useEffect, useState, useRef } from "react";
import moment from "moment";
import {
  Settings, Save, RefreshCw, Power, Clock, Bell, Calendar, User,
  CheckCircle, MessageCircle, ExternalLink, Server, Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { getConfig, saveConfig, getCalendarMonth, getCalendarPeople, getSystemConfig, saveSystemConfig, getTelegramLinkStatus } from "../api";
import type { NotifyConfig, SystemConfig, CalendarEvent } from "../types";

function Toggle({ checked, onChange, color = "bg-brand-500" }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? color : "bg-gray-700"}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

type Tab = "user" | "system";

export default function Config() {
  const [tab, setTab] = useState<Tab>("user");

  // User config
  const [config, setConfig] = useState<NotifyConfig>({
    enabled: false, sendBeforeMinutes: 30, sendAtDayStart: true,
    dayStartTime: "07:30", dayEndTime: "", startShiftMessage: "",
    endShiftMessage: "", activeDays: [1, 2, 3, 4, 5], ownerCalendarName: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System config
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    calendarId: "", slackWebhookUrl: "", telegramChatId: "",
    timezone: "Asia/Ho_Chi_Minh", defaultStartMessage: "", defaultEndMessage: "",
  });
  const [sysLoading, setSysLoading] = useState(false);
  const [sysSaving, setSysSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Telegram link status
  const [telegramLinked, setTelegramLinked] = useState<{ linked: boolean; telegramUsername: string | null } | null>(null);

  // Calendar people
  const [calendarPeople, setCalendarPeople] = useState<{ displayName: string; githubLogin: string }[]>([]);
  const [matchedDates, setMatchedDates] = useState<CalendarEvent[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => toast.error("Không tải được cấu hình"))
      .finally(() => setLoading(false));

    // Check admin + load system config
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.login?.toLowerCase() === "mido2610") {
          setIsAdmin(true);
          setSysLoading(true);
          getSystemConfig()
            .then(setSysConfig)
            .catch(() => {})
            .finally(() => setSysLoading(false));
        }
      } catch {}
    }

    getTelegramLinkStatus().then(setTelegramLinked).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingPeople(true);
    getCalendarPeople()
      .then((people: { summary: string; displayName: string; githubLogin?: string }[]) => {
        setCalendarPeople(people.map(p => ({ displayName: p.displayName, githubLogin: p.githubLogin || p.summary })));
      })
      .catch(() => {})
      .finally(() => setLoadingPeople(false));
  }, []);

  useEffect(() => {
    const name = config.ownerCalendarName.trim();
    if (!name) { setMatchedDates([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const now = moment();
        const { events: rawEvents } = await getCalendarMonth(now.year(), now.month() + 1);
        const events: CalendarEvent[] = rawEvents;
        const lower = name.toLowerCase();
        const matched = events.filter(e =>
          e.summary.toLowerCase().includes(lower) || (e.displayName || "").toLowerCase().includes(lower)
        );
        setMatchedDates(matched);
        const daysOfWeek = [...new Set(matched.map(e => moment(e.date).day()))].sort();
        if (daysOfWeek.length > 0) setConfig(c => ({ ...c, activeDays: daysOfWeek }));
      } catch { setMatchedDates([]); }
    }, 300);
  }, [config.ownerCalendarName]);

  const handleSave = async () => {
    if (!config.ownerCalendarName.trim()) { toast.error("Vui lòng chọn tên trong calendar"); return; }
    setSaving(true);
    try {
      const updated = await saveConfig(config as unknown as Record<string, unknown>);
      setConfig(updated);
      toast.success("Đã lưu cấu hình");
    } catch { toast.error("Lưu thất bại"); }
    finally { setSaving(false); }
  };

  const handleSaveSys = async () => {
    setSysSaving(true);
    try {
      const updated = await saveSystemConfig(sysConfig as unknown as Record<string, unknown>);
      setSysConfig(updated);
      toast.success("Đã lưu System Settings");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lưu thất bại");
    } finally { setSysSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-6 h-6 text-gray-600 animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-100">Cấu hình</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab("user")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "user" ? "bg-gray-800 text-gray-100" : "text-gray-500 hover:text-gray-300"}`}
        >
          <User className="w-4 h-4" /> User Settings
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("system")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "system" ? "bg-gray-800 text-gray-100" : "text-gray-500 hover:text-gray-300"}`}
          >
            <Server className="w-4 h-4" /> System Settings
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">Admin</span>
          </button>
        )}
      </div>

      {/* ── USER SETTINGS ── */}
      {tab === "user" && (
        <div className="space-y-3">
          {/* ShiftBot */}
          <div className="bg-[#229ED9]/10 border border-[#229ED9]/30 rounded-xl p-5 space-y-3">
            <a href="https://t.me/workshift_notifier_bot" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#229ED9]/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-[#229ED9]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">ShiftBot — Ghi nhận ca trực</p>
                  <p className="text-xs text-gray-500 mt-0.5">@workshift_notifier_bot · Nhắn /endshift để kết ca</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#229ED9] transition-colors" />
            </a>
            {telegramLinked !== null && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${telegramLinked.linked ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                <div className={`w-2 h-2 rounded-full ${telegramLinked.linked ? "bg-green-400" : "bg-gray-600"}`} />
                {telegramLinked.linked
                  ? <>Đã liên kết{telegramLinked.telegramUsername ? ` · @${telegramLinked.telegramUsername}` : ""} · Nhắn <code className="bg-green-500/20 px-1 rounded">/unlink</code> để hủy</>
                  : <>Chưa liên kết · Nhắn <code className="bg-gray-700 px-1 rounded">/link &lt;github_username&gt;</code> trong bot để nhận thông báo riêng</>
                }
              </div>
            )}
          </div>

          {/* Calendar name */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Tên trong Google Calendar</h3>
              <span className="text-xs text-red-400">* bắt buộc</span>
              {loadingPeople && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
            </div>
            <select value={config.ownerCalendarName}
              onChange={(e) => setConfig(c => ({ ...c, ownerCalendarName: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500">
              <option value="">-- Chọn tên của bạn --</option>
              {calendarPeople.map(p => <option key={p.githubLogin} value={p.displayName}>{p.displayName}</option>)}
            </select>
            {config.ownerCalendarName && (
              matchedDates.length === 0
                ? <p className="text-xs text-yellow-500">Không tìm thấy ca nào trong tháng này</p>
                : <div className="space-y-1">
                    <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{matchedDates.length} ca trong tháng này</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {matchedDates.map(e => (
                        <span key={e.id} className="text-[11px] bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-0.5">
                          {moment(e.date).format("DD/MM")}
                          {e.startDateTime && ` ${moment(e.startDateTime).format("HH:mm")}`}
                          {e.endDateTime && `–${moment(e.endDateTime).format("HH:mm")}`}
                        </span>
                      ))}
                    </div>
                  </div>
            )}
          </div>

          {/* Auto send */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${config.enabled ? "bg-green-500/15" : "bg-gray-800"}`}>
                  <Power className={`w-4 h-4 ${config.enabled ? "text-green-400" : "text-gray-500"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Tự động gửi</p>
                  <p className="text-xs text-gray-500 mt-0.5">{config.enabled ? "Scheduler đang chạy" : "Đang tắt"}</p>
                </div>
              </div>
              <Toggle checked={config.enabled} onChange={() => setConfig(c => ({ ...c, enabled: !c.enabled }))} color="bg-green-500" />
            </div>
          </div>

          {/* Active days */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Ngày gửi tự động</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[{ label: "CN", value: 0 }, { label: "T2", value: 1 }, { label: "T3", value: 2 }, { label: "T4", value: 3 }, { label: "T5", value: 4 }, { label: "T6", value: 5 }, { label: "T7", value: 6 }]
                .map(({ label, value }) => {
                  const active = config.activeDays.includes(value);
                  return (
                    <button key={value} type="button"
                      onClick={() => setConfig(c => ({ ...c, activeDays: active ? c.activeDays.filter(d => d !== value) : [...c.activeDays, value].sort() }))}
                      className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-brand-600/30 text-brand-400 border border-brand-500/40" : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"}`}>
                      {label}
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-gray-600">Scheduler chỉ gửi vào các ngày được chọn.</p>
          </div>

          {/* Reminder minutes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Nhắc trước ca</h3>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-gray-500">Gửi trước giờ bắt đầu ca</label>
                <span className={`text-sm font-semibold tabular-nums ${config.sendBeforeMinutes === 0 ? "text-gray-500" : "text-brand-400"}`}>
                  {config.sendBeforeMinutes === 0 ? "Tắt" : `${config.sendBeforeMinutes} phút`}
                </span>
              </div>
              <input type="range" min={0} max={120} step={5} value={config.sendBeforeMinutes}
                onChange={e => setConfig(c => ({ ...c, sendBeforeMinutes: Number(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-gray-700" />
              <div className="flex justify-between text-[11px] text-gray-600 mt-1.5">
                <span>Tắt</span><span>30 phút</span><span>1 giờ</span><span>2 giờ</span>
              </div>
            </div>
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
              <Toggle checked={config.sendAtDayStart} onChange={() => setConfig(c => ({ ...c, sendAtDayStart: !c.sendAtDayStart }))} />
            </div>
            {config.sendAtDayStart && (
              <div className="pt-1 border-t border-gray-800">
                <label className="text-xs text-gray-500 block mb-2">Giờ gửi (giờ Việt Nam)</label>
                <input type="time" value={config.dayStartTime}
                  onChange={e => setConfig(c => ({ ...c, dayStartTime: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 w-32" />
              </div>
            )}
          </div>

          {/* Start message */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Tin nhắn đầu ca</h3>
            </div>
            <textarea value={config.startShiftMessage}
              onChange={e => setConfig(c => ({ ...c, startShiftMessage: e.target.value }))}
              placeholder="Nhập nội dung tự động gửi lúc đầu ca..." rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none" />
          </div>

          {/* End shift */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Tin nhắn cuối ca</h3>
            </div>
            <div className="border-b border-gray-800 pb-4">
              <label className="text-xs text-gray-500 block mb-2">Giờ gửi cuối ca (giờ Việt Nam)</label>
              <div className="flex items-center gap-2">
                <input type="time" value={config.dayEndTime}
                  onChange={e => setConfig(c => ({ ...c, dayEndTime: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 w-32" />
                {config.dayEndTime && (
                  <button type="button" onClick={() => setConfig(c => ({ ...c, dayEndTime: "" }))}
                    className="text-xs text-gray-500 hover:text-gray-300">Xóa</button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                {config.dayEndTime ? `Gửi lúc ${config.dayEndTime} vào ngày có ca.` : "Để trống → gửi theo giờ kết thúc trong Google Calendar."}
              </p>
            </div>
            <textarea value={config.endShiftMessage}
              onChange={e => setConfig(c => ({ ...c, endShiftMessage: e.target.value }))}
              placeholder="Nhập nội dung tự động gửi lúc cuối ca..." rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none" />
          </div>

          {/* Save */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu cấu hình
            </button>
            {config.updatedBy && <p className="text-xs text-gray-600">Cập nhật bởi <span className="text-gray-500">@{config.updatedBy}</span></p>}
          </div>
        </div>
      )}

      {/* ── SYSTEM SETTINGS ── */}
      {tab === "system" && isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-2">
            <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">Chỉ admin mới thấy và sửa được tab này.</p>
          </div>

          {sysLoading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 text-gray-600 animate-spin" /></div>
          ) : (
            <>
              {[
                { label: "Google Calendar ID", key: "calendarId", placeholder: "c_93cae9ea...@group.calendar.google.com" },
                { label: "Slack Webhook URL", key: "slackWebhookUrl", placeholder: "https://hooks.slack.com/services/..." },
                { label: "Telegram Chat ID", key: "telegramChatId", placeholder: "-1001234567890" },
                { label: "Timezone", key: "timezone", placeholder: "Asia/Ho_Chi_Minh" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
                  <label className="text-sm font-medium text-gray-200">{label}</label>
                  <input
                    value={(sysConfig as any)[key] || ""}
                    onChange={e => setSysConfig(c => ({ ...c, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              ))}

              {[
                { label: "Default message đầu ca", key: "defaultStartMessage", placeholder: "Template mặc định cho tin nhắn đầu ca..." },
                { label: "Default message cuối ca", key: "defaultEndMessage", placeholder: "Template mặc định cho tin nhắn cuối ca..." },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
                  <label className="text-sm font-medium text-gray-200">{label}</label>
                  <textarea
                    value={(sysConfig as any)[key] || ""}
                    onChange={e => setSysConfig(c => ({ ...c, [key]: e.target.value }))}
                    placeholder={placeholder} rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <button onClick={handleSaveSys} disabled={sysSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors">
                  {sysSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu System Settings
                </button>
                {sysConfig.updatedBy && <p className="text-xs text-gray-600">Cập nhật bởi <span className="text-gray-500">@{sysConfig.updatedBy}</span></p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
