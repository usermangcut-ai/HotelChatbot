import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { formatDate, formatVnd } from "../../lib/format";
import { parseRich } from "../../lib/richText";
import type { AvailabilityCard } from "../../lib/toolResults";
import { useRooms } from "../../lib/useRooms";
import ChatBookingCard from "./ChatBookingCard";
import { useChat } from "./ChatProvider";
import s from "./chat.module.css";

const GREETING = "Chào anh/chị, em là lễ tân trực tuyến của Khaifrost Resort. Em có thể giúp gì ạ?";

function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((b, i) => b.type === "p"
        ? <p key={i}>{b.parts.map((p, j) => p.bold ? <strong key={j}>{p.text}</strong> : <Fragment key={j}>{p.text}</Fragment>)}</p>
        : <ul key={i}>{b.items.map((item, j) => <li key={j}>{item.map((p, k) => p.bold ? <strong key={k}>{p.text}</strong> : <Fragment key={k}>{p.text}</Fragment>)}</li>)}</ul>)}
    </>
  );
}

function AvailabilityCardView({ card }: { card: AvailabilityCard }) {
  const { rooms } = useRooms();
  const { addBookingDraft } = useChat();
  // "23/10 – 25/10" (bỏ năm cho gọn trong thẻ hẹp)
  const range = card.checkIn && card.checkOut ? `${formatDate(card.checkIn).slice(0, 5)} – ${formatDate(card.checkOut).slice(0, 5)}` : "hôm nay";
  return (
    <div className={s["msg-card"]}>
      <div className={s.body}>
        <span className={s.k}>Phòng trống · {range}</span>
        <ul className={s["avail-list"]}>
          {card.rooms.map(r => {
            const price = rooms?.find(x => x.room_type === r.roomType)?.price_vnd;
            return (
              <li key={r.roomType} className={r.available ? "" : s.none}>
                <div>
                  <b>{r.roomType}</b>
                  <small>{r.available ? `còn ${r.available} phòng` : "hết phòng"}{price ? ` · ${formatVnd(price)}/đêm` : ""}</small>
                </div>
                {r.available > 0 && (
                  <button type="button" className={s["book-sm"]} onClick={() => addBookingDraft({ kind: "booking", roomType: r.roomType, checkIn: card.checkIn, checkOut: card.checkOut, numGuests: null })}>Đặt</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function ChatDrawer() {
  const { isOpen, close, messages, pending, send, reset } = useChat();
  const { rooms } = useRooms();   // giá phòng tải xong làm phiếu cao thêm dòng "Tạm tính" → cuộn lại
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
  useEffect(() => { scrollToEnd(); }, [messages, pending, rooms]);

  const submit = (e: FormEvent) => { e.preventDefault(); send(text); setText(""); };

  return (
    <>
      <aside className={`${s.drawer} ${isOpen ? s.open : ""}`} role="dialog" aria-label="Trò chuyện với lễ tân" aria-hidden={!isOpen} inert={!isOpen}>
        <div className={s["drawer-head"]}>
          <span className={s.avatar}>S</span>
          <div className={s.title}><strong>Lễ tân Khaifrost Resort</strong><small>Trợ lý trực tuyến</small></div>
          <button type="button" className={`${s["icon-btn"]} ${s.subtle}`} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={reset}>↺</button>
          <button type="button" className={s["icon-btn"]} aria-label="Đóng" onClick={close}>✕</button>
        </div>
        <div className={s.thread} ref={thread} aria-live="polite">
          <div className={`${s.msg} ${s.bot}`}>{GREETING}</div>
          {messages.map(m => (
            <Fragment key={m.id}>
              {m.text && <div className={`${s.msg} ${m.role === "user" ? s.me : s.bot} ${m.error ? s.error : ""}`}>{m.role === "bot" && !m.error ? <RichText text={m.text} /> : m.text}</div>}
              {m.attachments?.map((a, i) => a.kind === "photo"
                ? <figure key={i} className={s["msg-card"]} style={{ margin: 0 }}>
                    <img src={a.imageUrl} alt={`Ảnh ${a.subject}`} onLoad={scrollToEnd} />
                    <div className={s.body}><span className={s.k}>Ảnh</span><h4>{a.subject === "hotel" ? "Toàn cảnh resort" : a.subject}</h4></div>
                  </figure>
                : a.kind === "availability" ? <AvailabilityCardView key={i} card={a} />
                : <ChatBookingCard key={i} cacheKey={`${m.id}:${i}`} draft={a} />)}
            </Fragment>
          ))}
          {pending && <div className={`${s.msg} ${s.bot}`} aria-label="Lễ tân đang trả lời"><span className={s.typing}><i /><i /><i /></span></div>}
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
