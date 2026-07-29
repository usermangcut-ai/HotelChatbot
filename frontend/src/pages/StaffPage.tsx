import { Bell, CheckCircle2, ClipboardList, KeyRound, Sparkles, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchStaffRequests,
  fetchStaffServiceRequests,
  markStaffRequest,
  markStaffServiceRequest,
  type ServiceRequestRecord,
  type StaffRequestRecord,
} from "../api";
import ChangePasswordForm from "../components/ChangePasswordForm";

const REQUEST_TYPE_ICON: Record<string, typeof Bell> = {
  don_phong: Sparkles,
  goi_nhan_vien: Bell,
  bao_hong: ClipboardList,
};

export default function StaffPage() {
  const [services, setServices] = useState<ServiceRequestRecord[]>([]);
  const [requests, setRequests] = useState<StaffRequestRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [error, setError] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  async function load() {
    setError("");
    try {
      const [s, r] = await Promise.all([fetchStaffServiceRequests(), fetchStaffRequests()]);
      setServices(s);
      setRequests(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được hàng đợi.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingServices = services.filter((s) => s.status === "received");
  const doneServices = services.filter((s) => s.status !== "received");
  const pendingRequests = requests.filter((r) => r.status === "received");
  const doneRequests = requests.filter((r) => r.status !== "received");

  const showPending = filter !== "done";
  const showDone = filter !== "pending";

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-dark flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-gold" />
          </span>
          <h1 className="font-serif-display text-2xl text-primary-dark">Hàng đợi xử lý</h1>
        </div>
        <button
          onClick={() => setShowPasswordForm((v) => !v)}
          className="text-xs flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-gray-600 hover:border-gold hover:text-primary-dark"
        >
          <KeyRound className="w-3.5 h-3.5" /> Đổi mật khẩu
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">
        Đang chờ: {pendingServices.length + pendingRequests.length} · Đã xử lý:{" "}
        {doneServices.length + doneRequests.length}
      </p>

      {showPasswordForm && (
        <div className="mb-6">
          <ChangePasswordForm />
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(["all", "pending", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              filter === f ? "bg-primary-dark text-white border-primary-dark" : "border-gray-300 text-gray-600"
            }`}
          >
            {f === "all" ? "Tất cả" : f === "pending" ? "Đang chờ" : "Đã xử lý"}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="space-y-3">
        {showPending &&
          pendingServices.map((s) => (
            <div key={`svc-${s.id}`} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sand/50 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-gold-dark" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase text-gold-dark bg-sand/50 px-2 py-0.5 rounded-full mr-2">
                    {s.service_type === "spa" ? "Spa" : "Nhà hàng"}
                  </span>
                  <span className="text-sm font-semibold">{s.guest_name}</span>
                  <p className="text-xs text-gray-500 mt-1">{s.requested_at} — {s.note}</p>
                </div>
              </div>
              <button
                onClick={() => markStaffServiceRequest(s.id, "done").then(load)}
                className="text-xs bg-primary-dark text-white px-3 py-1.5 rounded-lg"
              >
                Đánh dấu xử lý
              </button>
            </div>
          ))}
        {showPending &&
          pendingRequests.map((r) => {
            const Icon = REQUEST_TYPE_ICON[r.request_type] || Bell;
            return (
              <div key={`req-${r.id}`} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-sand/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gold-dark" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase text-gold-dark bg-sand/50 px-2 py-0.5 rounded-full mr-2">
                      Hỗ trợ chung
                    </span>
                    <span className="text-sm font-semibold">Phòng {r.room_id}</span>
                    <p className="text-xs text-gray-500 mt-1">{r.request_type} — {r.note}</p>
                  </div>
                </div>
                <button
                  onClick={() => markStaffRequest(r.id, "done").then(load)}
                  className="text-xs bg-primary-dark text-white px-3 py-1.5 rounded-lg"
                >
                  Đánh dấu xử lý
                </button>
              </div>
            );
          })}
        {showDone &&
          [...doneServices.map((s) => ({ ...s, kind: "service" as const })),
           ...doneRequests.map((r) => ({ ...r, kind: "request" as const }))].map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="border border-gray-100 rounded-xl p-4 flex justify-between items-center opacity-60"
            >
              <span className="text-sm">
                {item.kind === "service"
                  ? `${(item as ServiceRequestRecord).service_type} — ${(item as ServiceRequestRecord).guest_name}`
                  : `Phòng ${(item as StaffRequestRecord).room_id} — ${(item as StaffRequestRecord).request_type}`}
              </span>
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
