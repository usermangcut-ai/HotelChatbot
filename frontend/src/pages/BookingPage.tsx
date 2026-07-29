import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchRooms, postBooking, type RoomOption } from "../api";

interface BookingState {
  room_type?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
}

interface PendingBooking {
  room_type: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  num_guests: number;
  total: number;
  nights: number;
}

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function BookingPage() {
  const location = useLocation();
  const prefill = (location.state as BookingState) || {};

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomType, setRoomType] = useState(prefill.room_type || "");
  const [checkIn, setCheckIn] = useState(prefill.check_in || "");
  const [checkOut, setCheckOut] = useState(prefill.check_out || "");
  const [numGuests, setNumGuests] = useState(prefill.num_guests || 2);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [confirmed, setConfirmed] = useState<{
    id: number;
    room_id?: string | null;
    guest_password?: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms().then((data) => {
      setRooms(data);
      setRoomType((current) => current || data[0]?.room_type || "");
    });
  }, []);

  const selectedRoom = rooms.find((r) => r.room_type === roomType);
  const nights =
    checkIn && checkOut
      ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
      : 0;
  const total = selectedRoom ? selectedRoom.price_vnd * nights : 0;

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    if (!guestName || !guestPhone || !guestEmail) {
      setError("Vui lòng nhập đầy đủ họ tên, số điện thoại và email.");
      return;
    }
    if (!Number.isInteger(numGuests) || numGuests < 1 || numGuests > 10) {
      setError("Số khách phải từ 1 đến 10.");
      return;
    }
    setPending({
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail,
      num_guests: numGuests,
      total,
      nights,
    });
  }

  async function handleConfirmPayment() {
    if (!pending) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await postBooking({
        room_type: pending.room_type,
        check_in: pending.check_in,
        check_out: pending.check_out,
        guest_name: pending.guest_name,
        guest_phone: pending.guest_phone,
        guest_email: pending.guest_email,
        num_guests: pending.num_guests,
      });
      setConfirmed({ id: result.id, room_id: result.room_id, guest_password: result.guest_password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
      setPending(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center space-y-3">
        <h1 className="font-serif-display text-2xl text-primary-dark">Đặt phòng thành công!</h1>
        <p className="text-sm text-gray-600">
          Mã đặt phòng của quý khách: <strong>#{confirmed.id}</strong>
        </p>
        {confirmed.room_id && confirmed.guest_password && (
          <div className="bg-sand/40 rounded-lg px-4 py-3 text-sm text-primary-dark text-left">
            <p className="font-semibold mb-1">Tài khoản khách lưu trú của quý khách:</p>
            <p>
              Số phòng: <strong>{confirmed.room_id}</strong> · Mật khẩu: <strong>{confirmed.guest_password}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Dùng tài khoản này ở mục "Đăng nhập" để gọi nhân viên/đặt dịch vụ nhanh trong thời gian lưu trú.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (pending) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <h1 className="font-serif-display text-2xl text-primary-dark">Thanh toán</h1>
        <p className="text-sm text-primary-dark">
          {pending.room_type} · {pending.nights} đêm · Tổng: <strong>{formatVnd(pending.total)}</strong>
        </p>
        <div className="w-48 h-48 mx-auto border-2 border-dashed border-gold flex items-center justify-center text-xs text-gray-500">
          Mã QR thanh toán (DEMO)
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleConfirmPayment}
          disabled={submitting}
          className="w-full bg-primary-dark text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
        >
          {submitting ? "Đang xử lý..." : "Tôi đã thanh toán"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="font-serif-display text-2xl text-primary-dark mb-6">Phiếu đặt phòng</h1>
      <form onSubmit={handleContinue} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Hạng phòng</label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {rooms.map((r) => (
              <option key={r.room_type} value={r.room_type}>
                {r.room_type} — {formatVnd(r.price_vnd)}/đêm
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
              Ngày nhận phòng
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
              Ngày trả phòng
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Số khách</label>
          <input
            type="number"
            min={1}
            max={10}
            value={numGuests}
            onChange={(e) => setNumGuests(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Họ và tên</label>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">
              Số điện thoại
            </label>
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Email</label>
            <input
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {nights > 0 && selectedRoom && (
          <div className="bg-sand/40 rounded-lg px-4 py-3 text-sm text-primary-dark">
            {selectedRoom.room_type} · {nights} đêm · Tổng: <strong>{formatVnd(total)}</strong>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-primary-dark text-white py-3 rounded-xl font-bold text-sm"
        >
          Kiểm tra &amp; Tạo phiếu
        </button>
      </form>
    </div>
  );
}
