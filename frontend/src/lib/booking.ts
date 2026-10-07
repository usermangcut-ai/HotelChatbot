import { nightsBetween } from "./format";

export const DEPOSIT_PER_NIGHT = 1_000_000;   // knowledge.json: đặt cọc 1.000.000đ/đêm

export function bookingTotals(pricePerNight: number, checkIn: string, checkOut: string) {
  const nights = Math.max(0, nightsBetween(checkIn, checkOut));
  return { nights, total: pricePerNight * nights, deposit: DEPOSIT_PER_NIGHT * nights };
}

export type Contact = { name: string; phone: string; email: string };
export type ContactErrors = Partial<Record<keyof Contact, string>>;

export function validateContact(c: Contact): ContactErrors {
  const e: ContactErrors = {};
  if (!c.name.trim()) e.name = "Nhập họ và tên.";
  if (c.phone.replace(/\D/g, "").length < 9) e.phone = "Số điện thoại chưa đúng.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = "Email chưa đúng.";
  return e;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function parseBookingQuery(search: string) {
  const q = new URLSearchParams(search);
  const date = (k: string) => { const v = q.get(k); return v && ISO.test(v) ? v : null; };
  const n = Number(q.get("num_guests"));
  return { roomType: q.get("room_type") || null, checkIn: date("check_in"), checkOut: date("check_out"),
           numGuests: Number.isInteger(n) && n > 0 ? n : null };
}

export type Role = "guest" | "staff" | "admin";
export function homeForRole(role: Role): string {
  return role === "guest" ? "/tai-khoan" : role === "staff" ? "/nhan-vien" : "/quan-tri";
}
