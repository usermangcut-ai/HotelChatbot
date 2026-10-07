import { useEffect, useRef } from "react";
import { HOTLINE } from "../../content";
import { transferNote } from "../../lib/booking";
import { formatVnd } from "../../lib/format";
import b from "./booking.module.css";

/** Ô vuông giả lập mã QR (không phải mã QR thật) — vẽ như mockup. */
function QrCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const x = ref.current?.getContext("2d");
    if (!x) return;
    const N = 29; let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = "#FBFAF6"; x.fillRect(0, 0, N, N); x.fillStyle = "#171714";
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (rnd() > .52) x.fillRect(i, j, 1, 1);
    const finder = (a: number, c: number) => { x.fillStyle = "#171714"; x.fillRect(a, c, 7, 7); x.fillStyle = "#FBFAF6"; x.fillRect(a + 1, c + 1, 5, 5); x.fillStyle = "#171714"; x.fillRect(a + 2, c + 2, 3, 3); };
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([a, c]) => { x.fillStyle = "#FBFAF6"; x.fillRect(a - 1, c - 1, 9, 9); finder(a, c); });
  }, []);
  return <canvas ref={ref} width={29} height={29} aria-label="Mã QR chuyển khoản (demo)" />;
}

export default function DepositQr({ amount, guestName, compact = false }: { amount: number; guestName: string; compact?: boolean }) {
  const qr = <div className={b.qr}><QrCanvas /><span className={b["demo-tag"]}>Demo</span></div>;
  if (compact) {
    return (
      <div className={`${b.pay} ${b.compact}`}>
        {qr}
        <dl>
          <dt>Cọc</dt><dd>{formatVnd(amount)}</dd>
          <dt>Nội dung</dt><dd>{transferNote(guestName)}</dd>
        </dl>
      </div>
    );
  }
  return (
    <div className={b.pay}>
      {qr}
      <div>
        <dl className={b.kv}>
          <dt>Số tiền cọc</dt><dd>{formatVnd(amount)}</dd>
          <dt>Nội dung</dt><dd>{transferNote(guestName)}</dd>
          <dt>Ngân hàng</dt><dd>Bản demo — không chuyển tiền thật</dd>
        </dl>
        <div className={b.callout}>Hủy trước 3 ngày so với ngày nhận phòng được hoàn 100% tiền cọc. Muốn hủy hoặc đổi ngày, gọi lễ tân {HOTLINE}.</div>
      </div>
    </div>
  );
}
