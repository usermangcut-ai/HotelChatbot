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

/** Mốc giờ "YYYY-MM-DD HH:MM[:SS]" hoặc "YYYY-MM-DDTHH:MM[:SS]" → "Hôm nay 09:42" / "Hôm qua …" / "Ngày mai …" / "17/10 19:00".
 *  `today` là ngày ISO theo giờ máy (toIsoDate). */
export function formatWhen(ts: string, today: string): string {
  const day = ts.slice(0, 10);
  const time = ts.slice(11, 16);
  const diff = nightsBetween(today, day);
  const label = diff === 0 ? "Hôm nay" : diff === -1 ? "Hôm qua" : diff === 1 ? "Ngày mai" : formatDate(day).slice(0, 5);
  return time ? `${label} ${time}` : label;
}
