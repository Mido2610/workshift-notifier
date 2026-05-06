import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Power, Clock, Bell, MessageSquare, RotateCcw, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { getConfig, saveConfig } from "../api";
import type { NotifyConfig } from "../types";

const DEFAULT_TEMPLATE = `🔔 <b>Thông báo lịch trực</b>
📅 Ngày: {date}
👤 Người trực: <b>{name}</b>
⏰ Ca: {time}

<i>Gửi tự động bởi Workshift Notifier</i>`;

const SAMPLE = {
  name: "Nguyễn Văn A",
  date: "thứ hai, 05/05/2026",
  time: "08:00 – 17:00",
  summary: "avpegnu - Trực",
};

function previewTemplate(template: string): string {
  return (template || DEFAULT_TEMPLATE)
    .replace(/\{name\}/g, SAMPLE.name)
    .replace(/\{date\}/g, SAMPLE.date)
    .replace(/\{time\}/g, SAMPLE.time)
    .replace(/\{summary\}/g, SAMPLE.summary);
}

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
    enabled: true,
    sendBeforeMinutes: 30,
    sendAtDayStart: true,
    dayStartTime: "07:30",
    messageTemplate: "",
    endShiftMessageTemplate: "",
    sendAtShiftEnd: false,
    activeDays: [1, 2, 3, 4, 5],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => toast.error("Không tải được cấu hình"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
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

        {/* Day start */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-200">Gửi đầu ngày</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Bật thông báo đầu ngày</p>
              <p className="text-xs text-gray-500 mt-0.5">Liệt kê toàn bộ ca trực trong ngày</p>
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

        {/* End shift message */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Tin nhắn cuối ca</h3>
            </div>
            <Toggle
              checked={config.sendAtShiftEnd}
              onChange={() => setConfig((c) => ({ ...c, sendAtShiftEnd: !c.sendAtShiftEnd }))}
            />
          </div>

          {config.sendAtShiftEnd && (
            <>
              <textarea
                value={config.endShiftMessageTemplate}
                onChange={(e) => setConfig((c) => ({ ...c, endShiftMessageTemplate: e.target.value }))}
                placeholder={`Nhập nội dung tin nhắn cuối ca...\nHỗ trợ biến: {name}, {date}, {time}`}
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none leading-relaxed"
              />
              {config.endShiftMessageTemplate && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2">Xem trước (dữ liệu mẫu):</p>
                  <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {previewTemplate(config.endShiftMessageTemplate)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message template */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-200">Nội dung tin nhắn</h3>
            </div>
            {config.messageTemplate && (
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, messageTemplate: "" }))}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset mặc định
              </button>
            )}
          </div>

          <textarea
            value={config.messageTemplate}
            onChange={(e) => setConfig((c) => ({ ...c, messageTemplate: e.target.value }))}
            placeholder={DEFAULT_TEMPLATE}
            rows={7}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-600">
            Để trống để dùng template mặc định. Hỗ trợ HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;.
          </p>

          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 mb-2">Xem trước (dữ liệu mẫu):</p>
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {previewTemplate(config.messageTemplate)}
              </pre>
            </div>
          </div>
        </div>

        {/* Save button */}
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
