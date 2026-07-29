import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { postServiceRequest } from "../api";
import { useAuth } from "../AuthContext";

interface ServiceState {
  service_type?: "restaurant" | "spa";
  requested_at?: string;
  party_size?: number;
}

const LABELS: Record<"restaurant" | "spa", string> = { restaurant: "Nhà hàng", spa: "Spa" };

export default function ServiceRequestPage() {
  const { auth, loading } = useAuth();
  const location = useLocation();
  const prefill = (location.state as ServiceState) || {};

  const [serviceType, setServiceType] = useState<"restaurant" | "spa">(
    prefill.service_type || "restaurant"
  );
  const [requestedAt, setRequestedAt] = useState(prefill.requested_at || "");
  const [partySize, setPartySize] = useState(prefill.party_size || 2);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ id: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!requestedAt) {
      setError("Vui lòng nhập thời gian mong muốn.");
      return;
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      setError("Số người phải từ 1 đến 20.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await postServiceRequest({
        service_type: serviceType,
        requested_at: requestedAt,
        party_size: partySize,
        note,
      });
      setSubmitted({ id: result.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center space-y-3">
        <h1 className="font-serif-display text-2xl text-primary-dark">Đã gửi yêu cầu!</h1>
        <p className="text-sm text-gray-600">
          Mã yêu cầu: <strong>#{submitted.id}</strong> — lễ tân sẽ liên hệ quý khách sớm.
        </p>
      </div>
    );
  }

  if (loading) return null;

  if (!auth || auth.role !== "guest") {
    return (
      <div className="max-w-xl mx-auto p-10 text-center space-y-3">
        <h1 className="font-serif-display text-2xl text-primary-dark">Chỉ dành cho khách đang lưu trú</h1>
        <p className="text-sm text-gray-600">
          Dịch vụ Nhà hàng &amp; Spa chỉ áp dụng cho khách đã đặt phòng tại resort. Vui lòng đặt phòng
          trước hoặc đăng nhập tài khoản khách (được cấp sau khi đặt phòng) để tiếp tục.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            to="/dat-phong"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-dark text-white"
          >
            Đặt phòng
          </Link>
          <Link
            to="/dang-nhap"
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-primary-dark text-primary-dark"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="font-serif-display text-2xl text-primary-dark mb-6">Phiếu yêu cầu dịch vụ</h1>
      <div className="flex gap-2 mb-6">
        {(["restaurant", "spa"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setServiceType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              serviceType === t
                ? "bg-primary-dark text-white border-primary-dark"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
            Thời gian mong muốn
          </label>
          <input
            value={requestedAt}
            onChange={(e) => setRequestedAt(e.target.value)}
            placeholder="Ví dụ: 19:30 hôm nay"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Số người</label>
          <input
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
            Ghi chú thêm
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-dark text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
        >
          {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
      </form>
    </div>
  );
}
