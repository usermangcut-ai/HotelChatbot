import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ui from "../../components/ui.module.css";
import { QUICK_ASKS } from "../../content";
import { formatDate, formatVnd, nightsBetween } from "../../lib/format";
import { bookingHref, type BookingDraft } from "../../lib/toolResults";
import { useRooms } from "../../lib/useRooms";
import { useChat } from "./ChatProvider";
import s from "./chat.module.css";

const COMPOSER_CHIPS = ["Xem hạng phòng", "Còn phòng trống?", "Giờ buffet sáng", "Chính sách hủy"];
const GREETING = "Chào anh/chị, em là lễ tân trực tuyến của Shanghai Resort. Em có thể giúp gì ạ?";

function BookingCard({ draft }: { draft: BookingDraft }) {
  const { rooms } = useRooms();
  const price = rooms?.find(r => r.room_type === draft.roomType)?.price_vnd;
  const nights = draft.checkIn && draft.checkOut ? nightsBetween(draft.checkIn, draft.checkOut) : null;
  return (
    <div className={s["msg-card"]}>
      <div className={s.body}>
        <span className={s.k}>Phiếu đặt phòng</span>
        <h4>{draft.roomType ?? "Chọn hạng phòng"}</h4>
        <dl>
          <dt>Nhận phòng</dt><dd>{draft.checkIn ? formatDate(draft.checkIn) : "—"}</dd>
          <dt>Trả phòng</dt><dd>{draft.checkOut ? `${formatDate(draft.checkOut)}${nights ? ` · ${nights} đêm` : ""}` : "—"}</dd>
          <dt>Số khách</dt><dd>{draft.numGuests ?? "—"}</dd>
          {price && nights ? <><dt>Tạm tính</dt><dd>{formatVnd(price * nights)}</dd></> : null}
        </dl>
        <Link className={`${ui.btn} ${ui["btn-primary"]} ${s.btn}`} to={bookingHref(draft)}>Điền thông tin &amp; xác nhận</Link>
      </div>
    </div>
  );
}

export default function ChatDrawer() {
  const { isOpen, close, messages, pending, send, reset } = useChat();
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 300);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [isOpen, close]);

  // bọc trong {} — scrollTo() trả Promise ở trình duyệt mới; trả nó từ effect làm React tưởng là hàm dọn dẹp
  const scrollToEnd = () => { thread.current?.scrollTo({ top: thread.current.scrollHeight }); };
  useEffect(() => { scrollToEnd(); }, [messages, pending]);

  const submit = (e: FormEvent) => { e.preventDefault(); send(text); setText(""); };

  return (
    <>
      <div className={`${s.scrim} ${isOpen ? s.open : ""}`} onClick={close} />
      <aside className={`${s.drawer} ${isOpen ? s.open : ""}`} role="dialog" aria-label="Trò chuyện với lễ tân" aria-hidden={!isOpen} inert={!isOpen}>
        <div className={s["drawer-head"]}>
          <span className={s.avatar}>S</span>
          <div className={s.title}><strong>Lễ tân Shanghai Resort</strong><small>Trợ lý trực tuyến</small></div>
          <button type="button" className={s["icon-btn"]} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={reset}>↺</button>
          <button type="button" className={s["icon-btn"]} aria-label="Đóng" onClick={close}>✕</button>
        </div>
        <div className={s.thread} ref={thread} aria-live="polite">
          <div className={`${s.msg} ${s.bot}`}>{GREETING}</div>
          {messages.map(m => (
            <Fragment key={m.id}>
              <div className={`${s.msg} ${m.role === "user" ? s.me : s.bot} ${m.error ? s.error : ""}`}>{m.text}</div>
              {m.attachments?.map((a, i) => a.kind === "photo"
                ? <figure key={i} className={s["msg-card"]} style={{ margin: 0 }}>
                    <img src={a.imageUrl} alt={`Ảnh ${a.subject}`} onLoad={scrollToEnd} />
                    <div className={s.body}><span className={s.k}>Ảnh</span><h4>{a.subject === "hotel" ? "Toàn cảnh resort" : a.subject}</h4></div>
                  </figure>
                : <BookingCard key={i} draft={a} />)}
            </Fragment>
          ))}
          {pending && <div className={`${s.msg} ${s.bot}`} aria-label="Lễ tân đang trả lời"><span className={s.typing}><i /><i /><i /></span></div>}
        </div>
        <div className={s["composer-chips"]}>
          {COMPOSER_CHIPS.map(c => <button key={c} type="button" className={`${ui.chip} ${s.chip}`} disabled={pending} onClick={() => send(QUICK_ASKS[c])}>{c}</button>)}
        </div>
        <form className={s.composer} onSubmit={submit}>
          <label htmlFor="chat-input" hidden>Tin nhắn</label>
          <input id="chat-input" ref={input} value={text} onChange={e => setText(e.target.value)} placeholder="Nhập câu hỏi…" autoComplete="off" maxLength={500} />
          <button className={s.send} aria-label="Gửi" disabled={pending || !text.trim()}>↑</button>
        </form>
        <div className={s["drawer-foot"]}>Đóng tab là cuộc trò chuyện kết thúc · tải lại trang vẫn giữ tin nhắn</div>
      </aside>
    </>
  );
}
