import { useEffect, useId, useState } from "react";
import ui from "../../components/ui.module.css";
import { addDaysIso, bookingTotals, dateError, validateContact, type Contact, type ContactErrors } from "../../lib/booking";
import { formatDate, formatVnd } from "../../lib/format";
import type { BookingDraft } from "../../lib/toolResults";
import { useAvailability } from "../../lib/useAvailability";
import { useBookingSubmit, type SubmitState } from "../../lib/useBookingSubmit";
import { useRooms } from "../../lib/useRooms";
import BookingSuccess from "../booking/BookingSuccess";
import ContactFields from "../booking/ContactFields";
import DepositQr from "../booking/DepositQr";
import b from "../booking/booking.module.css";
import { useChat } from "./ChatProvider";
import s from "./chat.module.css";

type Snapshot = { step: 1 | 2 | 3; roomType: string; checkIn: string; checkOut: string; contact: Contact; editAll: boolean; submit: SubmitState };
/** Trạng thái phiếu chỉ sống trong RAM của trang: khung chat bị dựng lại khi đổi route thì phiếu giữ nguyên bước,
 *  F5 thì về bước 1 (chấp nhận — mật khẩu không được lưu xuống sessionStorage). */
const cache = new Map<string, Snapshot>();
const EMPTY: Contact = { name: "", phone: "", email: "" };
const short = (iso: string) => formatDate(iso).slice(0, 5);

export default function ChatBookingCard({ cacheKey, draft }: { cacheKey: string; draft: BookingDraft }) {
  const { rooms } = useRooms();
  const { addBotMessage } = useChat();
  const uid = useId();
  const [saved] = useState(() => cache.get(cacheKey));
  const [tomorrow] = useState(() => addDaysIso(new Date(), 1));
  const [step, setStep] = useState<Snapshot["step"]>(saved?.step ?? 1);
  const [roomType, setRoomType] = useState(saved?.roomType ?? draft.roomType ?? "");
  const [checkIn, setCheckIn] = useState(saved?.checkIn ?? draft.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(saved?.checkOut ?? draft.checkOut ?? "");
  const [contact, setContact] = useState<Contact>(saved?.contact ?? EMPTY);
  const [editAll, setEditAll] = useState(saved?.editAll ?? false);   // sau khi hết phòng: cho đổi cả hạng lẫn ngày
  const [errors, setErrors] = useState<ContactErrors>({});
  const { state: submit, submit: send, reset } = useBookingSubmit(saved && saved.submit.status !== "submitting" ? saved.submit : undefined);

  useEffect(() => { cache.set(cacheKey, { step, roomType, checkIn, checkOut, contact, editAll, submit }); });

  const room = rooms?.find(r => r.room_type === roomType) ?? null;
  const needRoom = editAll || !draft.roomType;
  const needDates = editAll || !draft.checkIn || !draft.checkOut;
  const dateErr = checkIn && checkOut ? dateError(checkIn, checkOut, tomorrow) : "Chọn ngày nhận và trả phòng.";
  const avail = useAvailability(room?.room_type ?? null, checkIn, checkOut, !dateErr);
  const totals = room && !dateErr ? bookingTotals(room.price_vnd, checkIn, checkOut) : null;
  const guests = Math.max(1, Math.min(draft.numGuests ?? 2, room?.max_occupancy ?? 2));
  const canBook = !!room && !dateErr && avail?.status === "ok" && avail.available > 0;
  const primary = `${ui.btn} ${ui["btn-primary"]} ${s.btn}`;
  const back = (to: Snapshot["step"]) => <button type="button" className={`${b["btn-link"]} ${b["compact-back"]}`} onClick={() => { reset(); setStep(to); }}>← Quay lại</button>;

  const confirm = async () => {
    if (!room) return;
    const r = await send({ room_type: room.room_type, check_in: checkIn, check_out: checkOut, guest_name: contact.name.trim(),
      guest_phone: contact.phone.trim(), guest_email: contact.email.trim(), num_guests: guests });
    if (!r) return;
    const prev = cache.get(cacheKey);   // khách có thể đã chuyển trang trong lúc chờ — vẫn ghi kết quả vào RAM
    if (prev) cache.set(cacheKey, { ...prev, submit: { status: "done", result: r } });
    addBotMessage(`Đã giữ phòng ${r.room_id ? `${r.room_id} ` : ""}(${r.room_type}, ${short(r.check_in)} – ${short(r.check_out)}) cho anh/chị.`);
  };

  if (submit.status === "done") {
    const r = submit.result;
    return (
      <div className={s["msg-card"]}>
        <div className={s.body}>
          <span className={s.k}>Đã giữ phòng · Mã #{r.id}</span>
          <h4>{r.room_type} · {short(r.check_in)} – {short(r.check_out)}</h4>
          <BookingSuccess result={r} guestName={contact.name} compact />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={s["msg-card"]}>
        <div className={s.body}>
          <span className={s.k}>Phiếu đặt phòng · Thông tin khách</span>
          <h4>{roomType}</h4>
          <ContactFields value={contact} onChange={setContact} errors={errors} compact idPrefix={`bk${uid}`} />
          <button type="button" className={primary} onClick={() => {
            const e = validateContact(contact); setErrors(e);
            if (Object.keys(e).length === 0) setStep(3);
          }}>Tiếp tục</button>
          {back(1)}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className={s["msg-card"]}>
        <div className={s.body}>
          <span className={s.k}>Phiếu đặt phòng · Đặt cọc</span>
          <h4>{roomType}</h4>
          <DepositQr amount={totals?.deposit ?? 0} guestName={contact.name} compact />
          {submit.status === "error" && <div className={`${b.avail} ${b.out} ${b.compact}`} role="alert"><span className={b.dot} /><span>{submit.message}</span></div>}
          {submit.status === "error" && submit.soldOut
            ? <button type="button" className={primary} onClick={() => { reset(); setEditAll(true); setStep(1); }}>Chọn ngày hoặc hạng khác</button>
            : <button type="button" className={primary} disabled={submit.status === "submitting"} onClick={confirm}>
                {submit.status === "submitting" ? "Đang giữ phòng…" : "Tôi đã chuyển khoản cọc"}
              </button>}
          {submit.status !== "submitting" && back(2)}
        </div>
      </div>
    );
  }

  const availNote = room && !dateErr && avail && !(avail.status === "ok" && avail.available > 0)
    ? <div className={`${b.avail} ${b.compact} ${avail.status === "checking" ? "" : b.out}`} role="status"><span className={b.dot} /><span>
        {avail.status === "checking" ? "Đang kiểm tra phòng trống…" : avail.status === "error" ? avail.message : "Hết phòng cho khoảng ngày này — thử ngày hoặc hạng khác."}
      </span></div>
    : null;

  return (
    <div className={s["msg-card"]}>
      <div className={s.body}>
        <span className={s.k}>Phiếu đặt phòng</span>
        {needRoom ? (
          <div className={`${b.field} ${b.compact}`}>
            <label htmlFor={`${uid}-room`}>Hạng phòng</label>
            <select className={b.control} id={`${uid}-room`} value={roomType} onChange={e => setRoomType(e.target.value)} disabled={!rooms}>
              <option value="">{rooms ? "Chọn hạng phòng" : "Đang tải hạng phòng…"}</option>
              {rooms?.map(r => <option key={r.room_type} value={r.room_type}>{r.room_type}</option>)}
            </select>
          </div>
        ) : <h4>{roomType}</h4>}
        {needDates && (
          <div className={`${b.fields} ${b.compact}`}>
            <div className={b.field}>
              <label htmlFor={`${uid}-in`}>Nhận phòng</label>
              <input className={b.control} type="date" id={`${uid}-in`} min={tomorrow} value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className={b.field}>
              <label htmlFor={`${uid}-out`}>Trả phòng</label>
              <input className={b.control} type="date" id={`${uid}-out`} min={tomorrow} value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
            {checkIn && checkOut && dateErr && <span className={`${b["err-line"]} ${b.full}`} role="alert">{dateErr}</span>}
          </div>
        )}
        <dl>
          {!needDates && <>
            <dt>Nhận phòng</dt><dd>{checkIn ? formatDate(checkIn) : "—"}</dd>
            <dt>Trả phòng</dt><dd>{checkOut ? `${formatDate(checkOut)}${totals ? ` · ${totals.nights} đêm` : ""}` : "—"}</dd>
          </>}
          <dt>Số khách</dt><dd>{guests}</dd>
          {room && totals ? <><dt>Tạm tính</dt><dd>{formatVnd(totals.total)}{needDates ? ` · ${totals.nights} đêm` : ""}</dd></> : null}
        </dl>
        {!needDates && dateErr && checkIn && checkOut && <span className={b["err-line"]} role="alert">{dateErr}</span>}
        {availNote}
        <button type="button" className={primary} disabled={!canBook} onClick={() => setStep(2)}>Đặt phòng này</button>
      </div>
    </div>
  );
}
