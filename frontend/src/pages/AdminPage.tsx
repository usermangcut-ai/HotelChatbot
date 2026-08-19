import { CalendarCheck2, ConciergeBell, LayoutDashboard, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createStaffAccount,
  deleteAdminBooking,
  deleteAdminServiceRequest,
  deleteStaffAccount,
  fetchAdminBookings,
  fetchAdminServiceRequests,
  fetchStaffAccounts,
  updateAdminBooking,
  updateAdminServiceRequest,
  type ReservationRecord,
  type ServiceRequestRecord,
  type StaffAccountRecord,
} from "../api";
import ChangePasswordForm from "../components/ChangePasswordForm";

export default function AdminPage() {
  const [tab, setTab] = useState<"bookings" | "services" | "accounts">("bookings");
  const [bookings, setBookings] = useState<ReservationRecord[]>([]);
  const [services, setServices] = useState<ServiceRequestRecord[]>([]);
  const [accounts, setAccounts] = useState<StaffAccountRecord[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [b, s, a] = await Promise.all([
        fetchAdminBookings(),
        fetchAdminServiceRequests(),
        fetchStaffAccounts(),
      ]);
      setBookings(b);
      setServices(s);
      setAccounts(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-9 h-9 rounded-lg bg-primary-dark flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-4 h-4 text-gold" />
        </span>
        <h1 className="font-serif-display text-2xl text-primary-dark">Bảng quản trị hệ thống</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">Quản lý toàn bộ đặt phòng và yêu cầu dịch vụ.</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("bookings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-1.5 ${
            tab === "bookings" ? "bg-primary-dark text-white border-primary-dark" : "border-gray-300 text-gray-600"
          }`}
        >
          <CalendarCheck2 className="w-3.5 h-3.5" /> Đặt phòng ({bookings.length})
        </button>
        <button
          onClick={() => setTab("services")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-1.5 ${
            tab === "services" ? "bg-primary-dark text-white border-primary-dark" : "border-gray-300 text-gray-600"
          }`}
        >
          <ConciergeBell className="w-3.5 h-3.5" /> Yêu cầu dịch vụ ({services.length})
        </button>
        <button
          onClick={() => setTab("accounts")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-1.5 ${
            tab === "accounts" ? "bg-primary-dark text-white border-primary-dark" : "border-gray-300 text-gray-600"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Tài khoản ({accounts.length})
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {tab === "accounts" ? (
        <div className="space-y-6">
          <ChangePasswordForm />
          <StaffAccountsPanel accounts={accounts} onChanged={load} setError={setError} />
        </div>
      ) : tab === "bookings" ? (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Hạng phòng</th>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Phòng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold">#{b.id}</td>
                  <td className="px-4 py-3">{b.room_type}</td>
                  <td className="px-4 py-3">
                    {b.check_in} → {b.check_out}
                  </td>
                  <td className="px-4 py-3">{b.guest_name}</td>
                  <td className="px-4 py-3">{b.room_id || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b.status === "paid"
                        ? "Đang lưu trú"
                        : b.status === "completed"
                          ? "Đã trả phòng"
                          : b.status === "cancelled"
                            ? "Đã hủy"
                            : b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => updateAdminBooking(b.id, "cancelled").then(load)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => deleteAdminBooking(b.id).then(load)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold">#{s.id}</td>
                  <td className="px-4 py-3">{s.service_type === "spa" ? "Spa" : "Nhà hàng"}</td>
                  <td className="px-4 py-3">{s.requested_at}</td>
                  <td className="px-4 py-3">{s.guest_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        s.status === "received" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => updateAdminServiceRequest(s.id, "cancelled").then(load)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => deleteAdminServiceRequest(s.id).then(load)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffAccountsPanel({
  accounts,
  onChanged,
  setError,
}: {
  accounts: StaffAccountRecord[];
  onChanged: () => void;
  setError: (msg: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đủ tên đăng nhập và mật khẩu.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createStaffAccount(username, password, role);
      setUsername("");
      setPassword("");
      setRole("staff");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được tài khoản.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u: string) {
    setError("");
    try {
      await deleteStaffAccount(u);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được tài khoản.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Tên đăng nhập</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Vai trò</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "staff" | "admin")}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="staff">Nhân viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {submitting ? "Đang tạo..." : "Thêm tài khoản"}
        </button>
      </form>

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Tên đăng nhập</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Tạo lúc</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.username} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold">{a.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      a.role === "admin" ? "bg-gold/20 text-gold-dark" : "bg-slate-100 text-gray-600"
                    }`}
                  >
                    {a.role === "admin" ? "Admin" : "Nhân viên"}
                  </span>
                </td>
                <td className="px-4 py-3">{a.created_at}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(a.username)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
