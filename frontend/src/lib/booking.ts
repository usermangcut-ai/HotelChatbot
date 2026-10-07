import { nightsBetween, toIsoDate } from "./format";

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

/** Ngày `n` ngày sau `from` (theo giờ máy) → "YYYY-MM-DD". */
export function addDaysIso(from: Date, n: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);
  return toIsoDate(d);
}

/** Mặc định trang đặt phòng: nhận phòng = ngày mai + 9 ngày, trả phòng = +2 đêm. */
export function defaultStay(today: Date) {
  return { checkIn: addDaysIso(today, 10), checkOut: addDaysIso(today, 12) };
}

/** Lỗi khoảng ngày (null = hợp lệ). `earliest` là ngày nhận phòng sớm nhất (hôm nay). */
export function dateError(checkIn: string, checkOut: string, earliest: string): string | null {
  if (!ISO.test(checkIn) || !ISO.test(checkOut)) return "Chọn ngày nhận và trả phòng.";
  if (checkIn < earliest) return "Ngày nhận phòng từ hôm nay trở đi.";
  if (checkOut <= checkIn) return "Ngày trả phòng phải sau ngày nhận phòng.";
  return null;
}

/** Nội dung chuyển khoản cọc: "Nguyễn Minh Anh" → "SR NGUYEN MINH ANH" (không dấu, viết hoa, tên dài rút còn ≤ 20 ký tự). */
export function transferNote(name: string): string {
  const words = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "D")
    .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  let short = "";
  for (const w of words) {
    const next = short ? `${short} ${w}` : w;
    if (next.length > 20) break;
    short = next;
  }
  return `SR ${short || (words[0]?.slice(0, 20) ?? "") || "DAT PHONG"}`;
}

/** Tên gọi: phần sau khoảng trắng cuối ("Nguyễn Minh Anh" → "Anh"); không có tên → "". */
export function givenName(full: string | null | undefined): string {
  const t = (full ?? "").trim();
  return t ? t.slice(t.lastIndexOf(" ") + 1) : "";
}

/** Tiến độ kỳ lưu trú tính theo ngày `today` (ISO): ngày thứ mấy, đã qua / còn bao nhiêu đêm. */
export function stayProgress(checkIn: string, checkOut: string, today: string) {
  const total = Math.max(0, nightsBetween(checkIn, checkOut));
  const passed = Math.min(total, Math.max(0, nightsBetween(checkIn, today)));
  return { total, passed, left: total - passed, day: passed + 1 };
}
