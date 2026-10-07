import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HOTLINE } from "../../content";
import type { BookingResponse } from "../../lib/api";
import { givenName } from "../../lib/booking";
import { formatDate, nightsBetween } from "../../lib/format";
import b from "./booking.module.css";

function Secret({ result, compact }: { result: BookingResponse; compact: boolean }) {
  const pw = useRef<HTMLElement>(null);
  const [copy, setCopy] = useState<"idle" | "ok" | "select">("idle");
  const onCopy = () => {
    const text = result.guest_password ?? "";
    const fallback = () => {   // không có quyền clipboard → bôi đen để khách tự nhấn Ctrl+C
      if (pw.current) { const r = document.createRange(); r.selectNodeContents(pw.current); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); }
      setCopy("select");
    };
    try { navigator.clipboard.writeText(text).then(() => setCopy("ok"), fallback); } catch { fallback(); }
  };
  return (
    <div className={`${b.secret} ${compact ? b.compact : ""}`}>
      <div className={b.row}><span>Số phòng</span><code>{result.room_id ?? "—"}</code><span></span></div>
      <div className={b.row}>
        <span>Mật khẩu khách</span><code ref={pw}>{result.guest_password ?? "—"}</code>
        {result.guest_password ? <button className={b.copy} type="button" onClick={onCopy}>{copy === "ok" ? "Đã sao chép" : copy === "select" ? "Đã chọn — nhấn Ctrl+C" : "Sao chép"}</button> : <span></span>}
      </div>
      <div className={b.warn}><span>⚠</span><span>Mật khẩu chỉ hiện một lần. Hãy lưu lại ngay — dùng để đăng nhập từ ngày nhận phòng.</span></div>
    </div>
  );
}

export default function BookingSuccess({ result, guestName, compact = false }: { result: BookingResponse; guestName: string; compact?: boolean }) {
  if (compact) return <Secret result={result} compact />;
  const name = givenName(guestName);
  const nights = nightsBetween(result.check_in, result.check_out);
  return (
    <section className={b.success}>
      <span className={b.badge}>● Đã giữ phòng</span>
      <h2>Cảm ơn anh/chị{name ? ` ${name}` : ""}, phòng đã được giữ</h2>
      <p>Mã đặt phòng <strong style={{ color: "var(--ink)" }}>#{result.id}</strong> · {result.room_type} · {formatDate(result.check_in)} – {formatDate(result.check_out)} ({nights} đêm)</p>
      <Secret result={result} compact={false} />
      <ol className={b.next}>
        <li>Từ ngày nhận phòng, đăng nhập bằng <b>số phòng</b> và <b>mật khẩu</b> ở trên để đặt bàn nhà hàng, spa hoặc gọi hỗ trợ.</li>
        <li>Cần hủy hoặc đổi ngày: gọi lễ tân <b>{HOTLINE}</b>.</li>
      </ol>
      <div className={b.actions} style={{ borderTop: 0, paddingTop: 0 }}>
        <Link className={`${b.btn} ${b["btn-ghost"]}`} to="/">Về trang chủ</Link>
      </div>
    </section>
  );
}
