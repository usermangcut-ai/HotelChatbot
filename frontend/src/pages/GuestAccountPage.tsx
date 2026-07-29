import { Bell, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { fetchMyRequests, postMyRequest, type StaffRequestRecord } from "../api";

const QUICK_ACTIONS = [
  { type: "don_phong", label: "Dọn phòng", icon: Sparkles },
  { type: "goi_nhan_vien", label: "Gọi nhân viên", icon: Bell },
  { type: "bao_hong", label: "Báo hỏng thiết bị", icon: ClipboardList },
];

export default function GuestAccountPage() {
  const { auth } = useAuth();
  const [history, setHistory] = useState<StaffRequestRecord[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      setHistory(await fetchMyRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function send(type: string) {
    setSending(true);
    setError("");
    try {
      await postMyRequest(type, note);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-2xl overflow-hidden relative h-36 mb-6">
        <img src="/images/hotel.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary-dark/50 flex items-end p-5">
          <div>
            <h1 className="font-serif-display text-2xl text-white mb-0.5">
              Chào mừng quý khách phòng {auth?.identity_id}
            </h1>
            <p className="text-xs text-white/80">
              Gọi nhân viên hoặc yêu cầu hỗ trợ nhanh, không cần nhập lại thông tin.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú thêm (tùy chọn)..."
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-gold"
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.type}
              disabled={sending}
              onClick={() => send(a.type)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-dark text-white disabled:opacity-40"
            >
              <a.icon className="w-3.5 h-3.5 text-gold" /> {a.label}
            </button>
          ))}
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <h2 className="font-serif-display text-lg text-primary-dark mb-3">Lịch sử yêu cầu</h2>
      <div className="space-y-2">
        {history.length === 0 && <p className="text-sm text-gray-400">Chưa có yêu cầu nào.</p>}
        {history.map((h) => (
          <div key={h.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center text-sm">
            <span>
              {h.request_type} {h.note && `— ${h.note}`}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                h.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {h.status === "done" ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Đã xử lý
                </>
              ) : (
                "Đang chờ"
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
