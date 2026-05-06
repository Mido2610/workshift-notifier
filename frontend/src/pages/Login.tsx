import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Github, AlertCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/dashboard");
  }, [navigate]);

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-brand-600/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-brand-500/30">
              <Bell className="w-7 h-7 text-brand-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-100">
              Workshift Notifier
            </h1>
            <p className="text-sm text-gray-500 mt-1 text-center">
              Tự động gửi thông báo lịch trực ca
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Đăng nhập thất bại. Thử lại.
            </div>
          )}

          <a
            href={`${API_URL}/api/auth/github`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm font-medium text-gray-100 transition-all duration-200 group"
          >
            <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Đăng nhập bằng GitHub
          </a>


          <p className="text-xs text-gray-600 text-center mt-6">
            Chỉ dành cho team Mmenu · engineer-management
          </p>
        </div>
      </div>
    </div>
  );
}
