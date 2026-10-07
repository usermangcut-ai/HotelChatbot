import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HOTLINE } from "../content";
import { ApiError, createServiceRequest, createStaffRequest, getMyRequests, getMyServiceRequests, getStay,
  type RequestStatus, type Stay } from "../lib/api";
import { useAuth } from "../lib/auth";
import { givenName, stayProgress } from "../lib/booking";
import { formatDate, formatWhen, toIsoDate } from "../lib/format";
import { useRooms } from "../lib/useRooms";
import s from "./GuestAccount.module.css";

type Kind = "restaurant" | "spa" | "support";
type Row = { key: string; kind: Kind; title: string; sub: string; status: RequestStatus; createdAt: string };

const ICONS: Record<Kind, ReactNode> = {
  restaurant: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11"/></svg>,
  spa: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M12 21c-4 0-7-3-7-7 3 0 5 1 7 3 2-2 4-3 7-3 0 4-3 7-7 7zM12 17c-2-3-2-7 0-11 2 4 2 8 0 11z"/></svg>,
  support: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5"><path d="M4 13a8 8 0 0 1 16 0M4 13v3a2 2 0 0 0 2 2h1v-6H6M20 13v3a2 2 0 0 1-2 2h-1v-6h1M17 18c0 2-2 3-5 3"/></svg>,
};
const STATUS: Record<RequestStatus, string> = { received: "Đã tiếp nhận", done: "Hoàn thành", cancelled: "Đã hủy" };
const ACTIONS: { kind: Kind; title: string; text: string }[] = [
  { kind: "restaurant", title: "Đặt bàn nhà hàng", text: "Orchid, Beachcomber, Lotus hoặc buffet" },
  { kind: "spa", title: "Đặt lịch spa", text: "Massage, tẩy tế bào chết, facial" },
  { kind: "support", title: "Gọi hỗ trợ", text: "Dọn phòng, thêm đồ dùng, báo hỏng thiết bị" },
];
const SUPPORT_TYPES = ["Dọn phòng", "Thêm khăn / đồ dùng", "Báo hỏng thiết bị", "Khác"];
const PLACEHOLDER: Record<Kind, string> = {
  restaurant: "Ví dụ: nhà hàng Orchid, bàn gần cửa sổ, có trẻ nhỏ",
  spa: "Ví dụ: massage đá nóng 60 phút",
  support: "Ví dụ: điều hòa phòng ngủ không mát",
};

type Form = { date: string; time: string; party: number; supportType: string; note: string };
const freshForm = (kind: Kind, today: string): Form =>
  ({ date: today, time: kind === "spa" ? "15:00" : "19:00", party: kind === "spa" ? 1 : 2, supportType: SUPPORT_TYPES[0], note: "" });

export default function GuestAccount() {
  const { me, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const { rooms } = useRooms();
  const [today] = useState(() => toIsoDate(new Date()));
  const [stay, setStay] = useState<Stay | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Kind | null>(null);
  const [lastSheet, setLastSheet] = useState<Kind>("restaurant");   // giữ nội dung ngăn kéo trong lúc trượt ra
  const [form, setForm] = useState<Form>(() => freshForm("restaurant", today));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 401 = hết kỳ lưu trú / phiên hết hạn → nạp lại phiên, guard sẽ đưa về /dang-nhap. */
  const handle = useCallback((e: unknown, setMsg: (m: string) => void) => {
    if (e instanceof ApiError && e.status === 401) { refresh(); return; }
    setMsg(e instanceof ApiError ? e.message : "Chưa kết nối được tới hệ thống. Thử lại giúp em.");
  }, [refresh]);

  const loadRequests = useCallback(() => {
    Promise.all([getMyRequests(), getMyServiceRequests()]).then(([staff, service]) => {
      const list: Row[] = [
        ...staff.map(r => ({ key: `s${r.id}`, kind: "support" as const, title: r.request_type,
          sub: `${formatWhen(r.created_at, today)}${r.note ? ` · ${r.note}` : ""}`, status: r.status, createdAt: r.created_at })),
        ...service.map(r => ({ key: `v${r.id}`, kind: r.service_type,
          title: `${r.service_type === "spa" ? "Lịch spa" : "Đặt bàn"}${r.party_size ? ` ${r.party_size} người` : ""}`,
          sub: `${r.requested_at ? `${formatWhen(r.requested_at, today)} · ` : ""}gửi ${formatWhen(r.created_at, today).toLowerCase()}`,
          status: r.status, createdAt: r.created_at })),
      ];
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      setRows(list);
    }).catch(e => handle(e, setLoadError));
  }, [handle, today]);

  useEffect(() => {
    getStay().then(setStay).catch(e => handle(e, setLoadError));
    loadRequests();
  }, [handle, loadRequests]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const openSheet = (kind: Kind) => { setSheet(kind); setLastSheet(kind); setForm(freshForm(kind, today)); setSendError(null); };
  const showToast = (text: string) => {
    setToast(text); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  const logout = async () => { navigate("/"); await signOut(); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sheet || sending) return;
    if (sheet !== "support" && (!form.date || !form.time || form.party < 1)) { setSendError("Chọn ngày, giờ và số người."); return; }
    setSending(true); setSendError(null);
    try {
      if (sheet === "support") await createStaffRequest(form.supportType, form.note.trim());
      else await createServiceRequest({ service_type: sheet, requested_at: `${form.date} ${form.time}`, party_size: form.party, note: form.note.trim() });
      setSheet(null);
      showToast("Đã gửi — nhân viên sẽ xác nhận sớm");
      loadRequests();
    } catch (err) {
      handle(err, setSendError);
    } finally {
      setSending(false);
    }
  };

  const roomId = stay?.room_id ?? me?.room_id ?? "";
  const name = givenName(stay?.guest_name);
  const progress = stay ? stayProgress(stay.check_in, stay.check_out, today) : null;
  const image = rooms?.find(r => r.room_type === stay?.room_type)?.image_url;
  const kind = sheet ?? lastSheet;
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  return (
    <>
      <header className={s.top}>
        <div className="wrap">
          <Link className={s.wordmark} to="/">Shanghai Resort</Link>
          <div className={s.who}>
            {roomId && <span className={s["room-chip"]}><span className={s.dot} /><span className={s.label}>Phòng</span> {roomId}</span>}
            <button type="button" className={s.logout} onClick={logout}>Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className={`wrap ${s.page}`}>
        <section className={s.hello}>
          <h1>Chào anh/chị{name ? ` ${name}` : ""}</h1>
          {progress && <p>Ngày thứ {progress.day} trong kỳ nghỉ · {progress.left > 0 ? `còn ${progress.left} đêm trước khi trả phòng.` : "hôm nay trả phòng trước 12:00."}</p>}
          {loadError && !stay && <p role="alert">{loadError}</p>}
          {stay && progress && (
            <div className={s.stay}>
              {image ? <img src={image} alt={`Phòng ${stay.room_type}`} /> : <div />}
              <div className={s.body}>
                <div><div className={s.meta}>Kỳ lưu trú hiện tại · Mã #{stay.reservation_id}</div><h2>{stay.room_type} · Phòng {stay.room_id}</h2></div>
                <div className={s["stay-facts"]}>
                  <div><small>Nhận phòng</small><span>{formatDate(stay.check_in)}</span></div>
                  <div><small>Trả phòng</small><span>{formatDate(stay.check_out).slice(0, 5)} · trước 12:00</span></div>
                  <div><small>Số khách</small><span>{stay.num_guests ?? "—"}</span></div>
                </div>
                <div className={s.progress} role="img" aria-label={`Đã qua ${progress.passed} trên ${progress.total} đêm`}>
                  <i style={{ width: `${progress.total ? (progress.passed / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className={s["sec-title"]}><h2>Cần gì, cứ gửi</h2><span>Nhân viên nhận yêu cầu ngay lập tức</span></div>
          <div className={s.actions}>
            {ACTIONS.map(a => (
              <button key={a.kind} type="button" className={s.action} onClick={() => openSheet(a.kind)}>
                {ICONS[a.kind]}<b>{a.title}</b><small>{a.text}</small>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className={s["sec-title"]}><h2>Yêu cầu của bạn</h2>{rows && <span>{rows.length} yêu cầu trong kỳ lưu trú này</span>}</div>
          <div className={s.list}>
            {rows && rows.length === 0 && <div className={s.empty}>Chưa có yêu cầu nào. Gửi yêu cầu đầu tiên ở các ô bên trên.</div>}
            {rows?.map(r => (
              <div key={r.key} className={s.req}>
                <span className={s.ico}>{ICONS[r.kind]}</span>
                <div><b>{r.title}</b><small>{r.sub}</small></div>
                <span className={`${s.pill} ${s[r.status]}`}>{STATUS[r.status]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={s.info}>
          <div className={s.box}><b>Giờ hoạt động</b>
            <dl><dt>Buffet sáng</dt><dd>06:00 – 10:30</dd><dt>Hồ bơi</dt><dd>06:00 – 22:00</dd><dt>Room service</dt><dd>24/24</dd><dt>Trả phòng</dt><dd>trước 12:00</dd></dl>
          </div>
          <div className={s.box}><b>Lễ tân 24/24</b>
            <span>Đổi ngày, gia hạn hoặc hủy đặt phòng, gọi trực tiếp:</span>
            <span className={s.copyable} style={{ fontSize: "var(--fs-lg)" }}>{HOTLINE}</span>
          </div>
        </section>
      </main>

      <div className={`${s.scrim} ${sheet ? s.open : ""}`} onClick={() => setSheet(null)} />
      <aside className={`${s.drawer} ${sheet ? s.open : ""}`} role="dialog" aria-labelledby="sheet-title" aria-hidden={!sheet} inert={!sheet}>
        <div className={s["drawer-head"]}>
          <b id="sheet-title">{ACTIONS.find(a => a.kind === kind)?.title}</b>
          <button type="button" className={s["icon-btn"]} aria-label="Đóng" onClick={() => setSheet(null)}>✕</button>
        </div>
        <form className={s.sheet} id="sheet" onSubmit={submit} noValidate>
          {kind === "support" ? (
            <>
              <div className={s.field}><span className={s.lbl} id="kind-label">Bạn cần gì?</span>
                <div className={s.choices} role="radiogroup" aria-labelledby="kind-label">
                  {SUPPORT_TYPES.map((t, i) => (
                    <Fragment key={t}>
                      <input type="radio" name="kind" id={`k${i}`} value={t} checked={form.supportType === t} onChange={() => set({ supportType: t })} />
                      <label htmlFor={`k${i}`}>{t}</label>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div className={s.field}>
                <label htmlFor="f-note">Mô tả thêm</label>
                <textarea className={s.control} id="f-note" placeholder={PLACEHOLDER.support} value={form.note} onChange={e => set({ note: e.target.value })} />
                {roomId && <span className={s.hint}>Nhân viên sẽ đến phòng {roomId}.</span>}
              </div>
            </>
          ) : (
            <>
              <div className={s.two}>
                <div className={s.field}><label htmlFor="f-date">Ngày</label><input className={s.control} id="f-date" type="date" min={today} value={form.date} onChange={e => set({ date: e.target.value })} /></div>
                <div className={s.field}><label htmlFor="f-time">Giờ</label><input className={s.control} id="f-time" type="time" value={form.time} onChange={e => set({ time: e.target.value })} /></div>
              </div>
              <div className={s.field}><label htmlFor="f-party">Số người</label>
                <input className={s.control} id="f-party" type="number" min={1} value={form.party} onChange={e => set({ party: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
              </div>
              <div className={s.field}><label htmlFor="f-note">Ghi chú</label>
                <textarea className={s.control} id="f-note" placeholder={PLACEHOLDER[kind]} value={form.note} onChange={e => set({ note: e.target.value })} />
              </div>
              <div className={s.prefill}>Gửi kèm tên và số điện thoại trong đặt phòng của bạn{stay?.guest_name ? ` (${stay.guest_name})` : ""} — không cần nhập lại.</div>
            </>
          )}
          {sendError && <div className={s["form-error"]} role="alert">{sendError}</div>}
        </form>
        <div className={s["sheet-foot"]}><button className={s.btn} form="sheet" type="submit" disabled={sending}>{sending ? "Đang gửi…" : "Gửi yêu cầu"}</button></div>
      </aside>
      <div className={`${s.toast} ${toast ? s.show : ""}`} role="status">{toast}</div>
    </>
  );
}
