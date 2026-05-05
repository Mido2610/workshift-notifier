import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Power, Clock, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { getConfig, saveConfig } from "../api";
import type { NotifyConfig } from "../types";

export default function Config() {
  const [config, setConfig] = useState<NotifyConfig>({
    enabled: true,
    sendBeforeMinutes: 30,
    sendAtDayStart: true,
    dayStartTime: "07:30",
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
      const updated = await saveConfig(config as Record<string, unknown>);
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
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-semibold">Cấu hình</h1>
      </div>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.enabled ? "bg-green-400/10" : "bg-gray-700/50"}`}>
                <Power className={`w-5 h-5 ${config.enabled ? "text-green-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="font-medium text-gray-200">Tự động gửi</p>
                <p className="text-sm text-gray-500">
                  {config.enabled ? "Đang bật — scheduler đang chạy" : "Đang tắt"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.enabled ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.enabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Day start notification */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-200">Gửi đầu ngày</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Gửi thông báo lúc đầu ngày</p>
              <p className="text-xs text-gray-500">Liệt kê tất cả ca trực trong ngày</p>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, sendAtDayStart: !c.sendAtDayStart }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.sendAtDayStart ? "bg-brand-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.sendAtDayStart ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {config.sendAtDayStart && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Giờ gửi (giờ Việt Nam)
              </label>
              <input
                type="time"
                value={config.dayStartTime}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, dayStartTime: e.target.value }))
                }
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 w-36"
              />
            </div>
          )}
        </div>

        {/* Before shift */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-200">Nhắc trước ca</h3>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">
              Gửi trước giờ bắt đầu ca (phút)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={config.sendBeforeMinutes}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    sendBeforeMinutes: Number(e.target.value),
                  }))
                }
                className="flex-1 accent-brand-500"
              />
              <span className="text-sm font-medium text-brand-400 w-20 text-right">
                {config.sendBeforeMinutes === 0
                  ? "Tắt"
                  : `${config.sendBeforeMinutes} phút`}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Đặt 0 để tắt nhắc trước ca
            </p>
          </div>
        </div>

        {/* Save */}
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
            Cập nhật lần cuối bởi: @{config.updatedBy}
          </p>
        )}
      </div>
    </div>
  );
}
