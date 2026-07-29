import { BedDouble, Lock, ShieldCheck, Waves } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { loginGuest, loginStaff } from "../api";

export default function LoginPage() {
  const [tab, setTab] = useState<"guest" | "staff">("guest");
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const identity =
        tab === "guest" ? await loginGuest(roomId, password) : await loginStaff(username, password);
      await refresh();
      if (identity.role === "admin") navigate("/quan-tri");
      else if (identity.role === "staff") navigate("/nhan-vien");
      else navigate("/tai-khoan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] relative flex items-center justify-center px-4 py-12 overflow-hidden">
      <img
        src="/images/hotel.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-primary-dark/85" />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-1">
          <span className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center mb-3">
            <Waves className="w-6 h-6 text-primary-dark" />
          </span>
          <h1 className="font-serif-display text-2xl text-primary-dark text-center">Shanghai Resort</h1>
        </div>
        <p className="text-xs text-gray-500 text-center uppercase tracking-wider mb-6">Đăng nhập</p>

        <div className="flex mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab("guest")}
            className={`flex-1 pb-3 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide ${
              tab === "guest" ? "text-primary-dark border-b-2 border-gold" : "text-gray-400"
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" /> Khách lưu trú
          </button>
          <button
            type="button"
            onClick={() => setTab("staff")}
            className={`flex-1 pb-3 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide ${
              tab === "staff" ? "text-primary-dark border-b-2 border-gold" : "text-gray-400"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Nhân viên / Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "guest" ? (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Số phòng</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Vd: 201"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
                Tên đăng nhập
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Vd: admin"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-dark text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
