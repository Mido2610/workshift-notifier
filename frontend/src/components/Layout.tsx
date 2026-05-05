import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ScrollText,
  LogOut,
  Bell,
} from "lucide-react";
import type { User } from "../types";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/config", icon: Settings, label: "Cấu hình" },
  { to: "/logs", icon: ScrollText, label: "Lịch sử" },
];

export default function Layout({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2 border-b border-gray-800">
          <Bell className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-sm tracking-wide">
            Workshift Notifier
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand-600/20 text-brand-400 font-medium"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-8 h-8 rounded-full ring-1 ring-gray-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-xs font-semibold text-brand-400">
                {user.login[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.login}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
