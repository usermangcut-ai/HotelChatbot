/** 3150000 → "3.150.000đ" (không phụ thuộc ICU của trình duyệt). */
export function formatVnd(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
}

/** "2026-10-16" → "16/10/2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Số đêm giữa 2 ngày ISO (tính theo UTC để không lệch giờ mùa/múi giờ). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const toUtc = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / 86_400_000);
}

/** Date theo giờ máy → "YYYY-MM-DD" (KHÔNG dùng toISOString: lệch ngày ở UTC+7 trước 7h sáng). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
