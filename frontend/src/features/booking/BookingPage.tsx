import { useState } from "react";
import { useLocation } from "react-router-dom";
import { addDaysIso, bookingTotals, dateError, defaultStay, parseBookingQuery, validateContact, type Contact, type ContactErrors } from "../../lib/booking";
import { formatDate, formatVnd } from "../../lib/format";
import { useAvailability } from "../../lib/useAvailability";
import { useBookingSubmit } from "../../lib/useBookingSubmit";
import { useRooms } from "../../lib/useRooms";
import { useChat } from "../chat/ChatProvider";
import BookingSuccess from "./BookingSuccess";
import ContactFields from "./ContactFields";
import DepositQr from "./DepositQr";
import b from "./booking.module.css";
import s from "./BookingPage.module.css";

type Step = 1 | 2 | 3;
const STEPS = ["Phòng & ngày", "Thông tin khách", "Đặt cọc"];
const EMPTY: Contact = { name: "", phone: "", email: "" };
const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function BookingPage() {
  const { search } = useLocation();
  const { open: openChat } = useChat();
  const { rooms, error: roomsError } = useRooms();
  const [init] = useState(() => {
    const q = parseBookingQuery(search);
    const today = new Date();
    const d = defaultStay(today);
    return { q, earliest: addDaysIso(today, 0), dayAfter: addDaysIso(today, 2),
             checkIn: q.checkIn ?? d.checkIn, checkOut: q.checkOut ?? d.checkOut };
  });
  const [picked, setPicked] = useState<string | null>(init.q.roomType);
  const [checkIn, setCheckIn] = useState(init.checkIn);
  const [checkOut, setCheckOut] = useState(init.checkOut);
  const [guestsWanted, setGuests] = useState(init.q.numGuests ?? 2);
  const [step, setStep] = useState<Step>(1);
  const [contact, setContact] = useState<Contact>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const { state: submit, submit: send, reset } = useBookingSubmit();

  const room = rooms?.find(r => r.room_type === picked) ?? rooms?.[0] ?? null;
  const maxGuests = room?.max_occupancy ?? 1;
  const guests = Math.max(1, Math.min(guestsWanted, maxGuests));
  const dateErr = dateError(checkIn, checkOut, init.earliest);
  const errOnIn = !checkIn || checkIn < init.earliest;   // lỗi thuộc ô nhận phòng hay ô trả phòng
  const avail = useAvailability(room?.room_type ?? null, checkIn, checkOut, !dateErr);
  const totals = room ? bookingTotals(room.price_vnd, checkIn, checkOut) : { nights: 0, total: 0, deposit: 0 };
  const canContinue = !!room && !dateErr && avail?.status === "ok" && avail.available > 0;
  const done = submit.status === "done";

  const go = (n: Step) => { setStep(n); top(); };
  const toStep3 = () => {
    const e = validateContact(contact);
    setErrors(e);
    if (Object.keys(e).length === 0) go(3);
  };
  const confirm = async () => {
    if (!room) return;
    await send({ room_type: room.room_type, check_in: checkIn, check_out: checkOut, guest_name: contact.name.trim(),
      guest_phone: contact.phone.trim(), guest_email: contact.email.trim(), num_guests: guests });
    top();
  };
  const backToStep1 = () => { reset(); go(1); };
  const nice = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatDate(iso) : "—");

  const stepClass = (n: number) => (done || n < step ? s.done : n === step ? s.active : "");

  let availLine = null;
  if (room && !dateErr && avail) {
    const out = avail.status === "error" || (avail.status === "ok" && avail.available === 0);
    const text = avail.status === "checking" ? "Đang kiểm tra phòng trống…"
      : avail.status === "error" ? avail.message
      : avail.available > 0 ? `Còn ${avail.available} phòng ${room.room_type} cho khoảng ngày này`
      : `Hết phòng ${room.room_type} cho khoảng ngày này — thử ngày khác hoặc hạng phòng khác`;
    availLine = <div className={`${b.avail} ${out ? b.out : ""}`} role="status"><span className={b.dot} /><span>{text}</span></div>;
  }

  return (
    <main className={`wrap ${s.page}`}>
      {!done && (
        <div className={s["page-head"]}>
          <h1>Đặt phòng</h1>
          <p>Đặt cọc 1.000.000đ mỗi đêm để giữ phòng. Phần còn lại thanh toán khi nhận phòng.</p>
        </div>
      )}

      <ol className={s.steps}>
        {STEPS.map((label, i) => <li key={label} className={stepClass(i + 1)}><span className={s.n}>{i + 1}</span>{label}</li>)}
      </ol>

      <div className={s.grid} style={done ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
        <div>
          {done ? <BookingSuccess result={submit.result} guestName={contact.name} />
          : step === 1 ? (
            <section className={s.panel}>
              <h2>Chọn phòng và ngày lưu trú</h2>
              <div className={b.fields}>
                <div className={`${b.field} ${b.full}`}>
                  <label htmlFor="room">Hạng phòng</label>
                  <select className={b.control} id="room" value={room?.room_type ?? ""} onChange={e => setPicked(e.target.value)} disabled={!rooms}>
                    {!rooms && <option value="">{roomsError ? "Chưa tải được danh sách phòng" : "Đang tải hạng phòng…"}</option>}
                    {rooms?.map(r => <option key={r.room_type} value={r.room_type}>{r.room_type} — {formatVnd(r.price_vnd)}/đêm</option>)}
                  </select>
                </div>
                <div className={b.field}>
                  <label htmlFor="checkin">Nhận phòng</label>
                  <input className={b.control} type="date" id="checkin" min={init.earliest} value={checkIn} onChange={e => setCheckIn(e.target.value)}
                    aria-invalid={dateErr && errOnIn ? true : undefined} aria-describedby={dateErr && errOnIn ? "date-msg" : undefined} />
                  <span className={b.hint}>Từ 15:00 · chọn từ hôm nay trở đi</span>
                  {dateErr && errOnIn && <span className={b.err} id="date-msg" role="alert">{dateErr}</span>}
                </div>
                <div className={b.field}>
                  <label htmlFor="checkout">Trả phòng</label>
                  <input className={b.control} type="date" id="checkout" min={init.dayAfter} value={checkOut} onChange={e => setCheckOut(e.target.value)}
                    aria-invalid={dateErr && !errOnIn ? true : undefined} aria-describedby={dateErr && !errOnIn ? "date-msg" : undefined} />
                  <span className={b.hint}>Trước 12:00</span>
                  {dateErr && !errOnIn && <span className={b.err} id="date-msg" role="alert">{dateErr}</span>}
                </div>
                <div className={b.field}>
                  <label id="guests-label">Số khách</label>
                  <div className={s.stepper} role="group" aria-labelledby="guests-label">
                    <button type="button" aria-label="Bớt một khách" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}>−</button>
                    <output>{guests}</output>
                    <button type="button" aria-label="Thêm một khách" disabled={guests >= maxGuests} onClick={() => setGuests(guests + 1)}>+</button>
                  </div>
                  {room && <span className={b.hint}>Hạng này tối đa {maxGuests} khách</span>}
                </div>
              </div>
              {availLine}
              <div className={b.actions}>
                <button className={b["btn-link"]} type="button" onClick={() => openChat()}>Chưa chắc chọn phòng nào? Hỏi lễ tân</button>
                <button className={`${b.btn} ${b["btn-primary"]}`} type="button" disabled={!canContinue} onClick={() => go(2)}>Tiếp tục</button>
              </div>
            </section>
          ) : step === 2 ? (
            <section className={s.panel}>
              <h2>Thông tin người đặt</h2>
              <ContactFields value={contact} onChange={setContact} errors={errors} />
              <div className={b.actions}>
                <button className={`${b.btn} ${b["btn-ghost"]}`} type="button" onClick={() => go(1)}>Quay lại</button>
                <button className={`${b.btn} ${b["btn-primary"]}`} type="button" onClick={toStep3}>Tiếp tục</button>
              </div>
            </section>
          ) : (
            <section className={s.panel}>
              <h2>Đặt cọc qua mã QR</h2>
              <DepositQr amount={totals.deposit} guestName={contact.name} />
              {submit.status === "error" && (
                <div className={`${b.avail} ${b.out}`} role="alert"><span className={b.dot} /><span>{submit.message}</span></div>
              )}
              <div className={b.actions}>
                <button className={`${b.btn} ${b["btn-ghost"]}`} type="button" onClick={() => { reset(); go(2); }}>Quay lại</button>
                {submit.status === "error" && submit.soldOut
                  ? <button className={`${b.btn} ${b["btn-primary"]}`} type="button" onClick={backToStep1}>Chọn lại phòng &amp; ngày</button>
                  : <button className={`${b.btn} ${b["btn-primary"]}`} type="button" disabled={submit.status === "submitting"} onClick={confirm}>
                      {submit.status === "submitting" ? "Đang giữ phòng…" : "Tôi đã chuyển khoản cọc"}
                    </button>}
              </div>
            </section>
          )}
        </div>

        {!done && room && (
          <aside className={s.summary}>
            {room.image_url && <img src={room.image_url} alt={`Phòng ${room.room_type}`} />}
            <div className={s.body}>
              <div><div className={s.meta}>{room.view} · {room.size_m2} m²</div><h3>{room.room_type}</h3></div>
              <div className={s.dates}>
                <div><small>Nhận phòng</small><span>{nice(checkIn)}</span></div>
                <div><small>Trả phòng</small><span>{nice(checkOut)}</span></div>
              </div>
              <div className={s.lines}>
                <div><span className={s.muted}>{formatVnd(room.price_vnd)} × {totals.nights} đêm</span><span>{formatVnd(totals.total)}</span></div>
                <div><span className={s.muted}>Số khách</span><span>{guests}</span></div>
                <div className={s.total}><span>Tổng tiền phòng</span><span>{formatVnd(totals.total)}</span></div>
                <div className={s.deposit}><span>Đặt cọc bây giờ</span><span>{formatVnd(totals.deposit)}</span></div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
