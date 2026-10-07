import { useEffect, useState } from "react";
import { ApiError, getAvailability } from "./api";

export type Availability =
  | { status: "checking" }
  | { status: "ok"; available: number }
  | { status: "error"; message: string };

/** Số phòng trống của một hạng cho khoảng ngày — gọi lại (debounce 300ms) mỗi khi hạng/ngày đổi.
 *  `null` khi chưa đủ thông tin (thiếu hạng hoặc ngày sai — người gọi tự báo lỗi ngày). */
export function useAvailability(roomType: string | null, checkIn: string, checkOut: string, valid: boolean): Availability | null {
  const key = roomType && valid ? JSON.stringify([roomType, checkIn, checkOut]) : null;
  const [result, setResult] = useState<{ key: string; value: Availability } | null>(null);

  useEffect(() => {
    if (!key) return;
    const [rt, ci, co] = JSON.parse(key) as [string, string, string];
    let alive = true;
    const t = setTimeout(() => {
      getAvailability(rt, ci, co)
        .then(r => { if (alive) setResult({ key, value: { status: "ok", available: r.available } }); })
        .catch(e => { if (alive) setResult({ key, value: { status: "error",
          message: e instanceof ApiError ? e.message : "Chưa kiểm tra được phòng trống. Thử lại sau giúp em." } }); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [key]);

  if (!key) return null;
  return result?.key === key ? result.value : { status: "checking" };
}
