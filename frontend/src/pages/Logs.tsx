import { useEffect, useState, useCallback } from "react";
import moment from "moment";
import {
  ScrollText,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
} from "lucide-react";
import { getLogs } from "../api";
import type { NotificationLog, Pagination } from "../types";

const LIMIT = 20;

export default function Logs() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLogs(page, LIMIT);
      setLogs(data.items || []);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl font-semibold">Lịch sử gửi</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Ngày</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Ca trực</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Người trực</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Loại</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Chưa có lịch sử gửi
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log._id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                  {moment(log.date).format("DD/MM/YYYY")}
                </td>
                <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate" title={log.eventSummary}>
                  {log.eventSummary}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-md">
                    @{log.githubLogin}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {log.triggerType === "scheduler" ? (
                    <span className="flex items-center gap-1.5 text-xs text-blue-400">
                      <Bot className="w-3 h-3" /> Auto
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-purple-400">
                      <User className="w-3 h-3" /> Manual
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {log.status === "sent" ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã gửi
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-1.5 text-xs text-red-400 cursor-help"
                      title={log.errorMessage}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Thất bại
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {moment(log.sentAt).format("HH:mm DD/MM")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              {pagination.total} bản ghi · trang {pagination.page}/{pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
