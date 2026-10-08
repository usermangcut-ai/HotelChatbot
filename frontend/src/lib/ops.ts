import type { Booking, RequestStatus, ServiceRequest, StaffRequest } from "./api";
import { nightsBetween } from "./format";

/** Cộng n ngày vào ngày ISO (tính theo UTC). */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const active = (b: Booking) => b.status !== "cancelled";

/** Số phòng có khách ở đêm `day` (check_in <= day < check_out), không tính booking hủy. */
export function occupancyOn(day: string, bookings: Booking[]): number {
  return bookings.filter(b => active(b) && b.check_in <= day && day < b.check_out).length;
}

/** Tiền phòng các booking nhận phòng trong tháng `ym` ("YYYY-MM"), status paid + completed. */
export function roomRevenueForMonth(ym: string, bookings: Booking[], priceByType: Record<string, number>): number {
  return bookings
    .filter(b => active(b) && b.check_in.startsWith(ym))
    .reduce((sum, b) => sum + (priceByType[b.room_type] ?? 0) * Math.max(0, nightsBetween(b.check_in, b.check_out)), 0);
}

/** Booking đã thanh toán nhận phòng từ ngày mai đến today+days. */
export function checkinsWithin(today: string, days: number, bookings: Booking[]): number {
  const end = addDaysIso(today, days);
  return bookings.filter(b => b.status === "paid" && b.check_in > today && b.check_in <= end).length;
}

/** [hạng phòng, số đêm đã đặt] giảm dần, bỏ booking hủy. */
export function nightsByRoomType(bookings: Booking[]): [string, number][] {
  const m = new Map<string, number>();
  for (const b of bookings.filter(active)) m.set(b.room_type, (m.get(b.room_type) ?? 0) + Math.max(0, nightsBetween(b.check_in, b.check_out)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export type QueueRow = {
  key: string; kind: "restaurant" | "spa" | "support"; id: number; title: string; note: string;
  room: string | null; guest: string | null; when: string | null; created_at: string; status: RequestStatus;
};

export function mergeQueue(service: ServiceRequest[], support: StaffRequest[]): QueueRow[] {
  const rows: QueueRow[] = [
    ...service.map((r): QueueRow => ({
      key: `service-${r.id}`, kind: r.service_type, id: r.id,
      title: `${r.service_type === "spa" ? "Lịch spa" : "Bàn"}${r.party_size ? ` ${r.party_size} người` : ""}`,
      note: r.note ?? "", room: r.room_id, guest: r.guest_name, when: r.requested_at, created_at: r.created_at, status: r.status,
    })),
    ...support.map((r): QueueRow => ({
      key: `support-${r.id}`, kind: "support", id: r.id, title: r.request_type, note: r.note ?? "",
      room: r.room_id, guest: null, when: null, created_at: r.created_at, status: r.status,
    })),
  ];
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}
