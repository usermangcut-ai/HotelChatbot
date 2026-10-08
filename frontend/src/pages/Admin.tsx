import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import BarChart from "../components/BarChart";
import ops from "../components/ops.module.css";
import { ICONS } from "../components/opsIcons";
import OpsLayout from "../components/OpsLayout";
import QueuePanel from "../components/QueuePanel";
import Toast from "../components/Toast";
import { ApiError, createStaffAccount, deleteBooking, deleteStaffAccount, getAdminBookings, getStaffAccounts, setBookingStatus,
  type Booking, type BookingStatus, type StaffAccount } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatVnd, nightsBetween, toIsoDate } from "../lib/format";
import { addDaysIso, checkinsWithin, nightsByRoomType, occupancyOn, roomRevenueForMonth, shortVnd, weekdayVi } from "../lib/ops";
import { useQueue } from "../lib/useQueue";
import { useRooms } from "../lib/useRooms";
import { useToast } from "../lib/useToast";
import s from "./Admin.module.css";

type View = "overview" | "bookings" | "requests" | "accounts" | "new-account";
const ST: Record<BookingStatus, string> = { paid: "Đã cọc", completed: "Đã trả phòng", cancelled: "Đã hủy" };
const pillClass = (st: BookingStatus) => (st === "cancelled" ? ops.bcancelled : ops[st]);
const dm = (iso: string) => formatDate(iso).slice(0, 5);
const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Chưa kết nối được tới hệ thống. Thử lại giúp em.");

export default function Admin() {
  const { me, refresh } = useAuth();
  const { rooms } = useRooms();
  const queue = useQueue("admin");
  const toast = useToast();
  const [today] = useState(() => toIsoDate(new Date()));
  const [view, setView] = useState<View>("overview");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [accounts, setAccounts] = useState<StaffAccount[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const guard = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { refresh(); return; }
    setLoadError(errText(e));
  }, [refresh]);
  useEffect(() => {
    getAdminBookings().then(setBookings).catch(guard);
    getStaffAccounts().then(setAccounts).catch(guard);
  }, [guard]);

  const priceByType = useMemo(() => Object.fromEntries((rooms ?? []).map(r => [r.room_type, r.price_vnd])), [rooms]);
  const totalRooms = useMemo(() => (rooms ?? []).reduce((n, r) => n + r.total_rooms, 0), [rooms]);
  const roomTotal = (b: Booking) => (priceByType[b.room_type] ?? 0) * Math.max(0, nightsBetween(b.check_in, b.check_out));

  const pending = (queue.rows ?? []).filter(r => r.status === "received");
  const pendingService = pending.filter(r => r.kind !== "support").length;

  const nav = [
    { key: "overview", label: "Tổng quan", icon: ICONS.overview },
    { key: "bookings", label: "Đặt phòng", icon: ICONS.bookings },
    { key: "requests", label: "Yêu cầu dịch vụ", short: "Yêu cầu", icon: ICONS.queue, count: pending.length },
    { key: "accounts", label: "Tài khoản nhân viên", short: "Tài khoản", icon: ICONS.accounts },
    { key: "new-account", label: "Tạo tài khoản", short: "Tạo TK", icon: ICONS.newAccount },
  ];

  return (
    <OpsLayout subtitle="Quản trị hệ thống" nav={nav} active={view} onSelect={k => setView(k as View)} mobile="tabs">
      {loadError && <div className={s["error-line"]} role="alert">{loadError}</div>}

      {view === "overview" && (
        <Overview bookings={bookings} today={today} totalRooms={totalRooms} priceByType={priceByType} roomTotal={roomTotal}
          pendingService={pendingService} pendingSupport={pending.length - pendingService} onAll={() => setView("bookings")} />
      )}

      {view === "bookings" && bookings && (
        <BookingsView bookings={bookings} roomTotal={roomTotal} notify={toast.show}
          onChange={(id, status) => setBookings(bs => bs && bs.map(b => (b.id === id ? { ...b, status } : b)))}
          onRemove={id => setBookings(bs => bs && bs.filter(b => b.id !== id))} />
      )}

      {view === "requests" && (
        <>
          <div className={ops.head}><div><h1>Yêu cầu dịch vụ</h1><p>Cùng hàng đợi với màn hình nhân viên, thêm quyền xóa</p></div></div>
          <QueuePanel rows={queue.rows} view="all" today={today} fresh={queue.fresh}
            onAct={async (row, status) => { const err = await queue.act(row, status); if (err) toast.show(err); }}
            onDelete={async row => { const err = await queue.remove(row); toast.show(err ?? "Đã xóa yêu cầu"); }} />
        </>
      )}

      {view === "accounts" && accounts && (
        <AccountsView accounts={accounts} me={me?.identity_id ?? ""} notify={toast.show} onChange={setAccounts}
          onNew={() => setView("new-account")} />
      )}

      {view === "new-account" && accounts && (
        <CreateAccountView accounts={accounts} notify={toast.show}
          onCreated={created => { setAccounts([...accounts, created]); setView("accounts"); }} />
      )}

      <Toast text={toast.text} />
    </OpsLayout>
  );
}

type OverviewProps = {
  bookings: Booking[] | null; today: string; totalRooms: number; priceByType: Record<string, number>;
  roomTotal: (b: Booking) => number; pendingService: number; pendingSupport: number; onAll: () => void;
};

function Overview({ bookings, today, totalRooms, priceByType, roomTotal, pendingService, pendingSupport, onAll }: OverviewProps) {
  const list = bookings ?? [];
  const occ = occupancyOn(today, list);
  const month = today.slice(0, 7);
  const bars = Array.from({ length: 14 }, (_, i) => {
    const day = addDaysIso(today, i);
    return { label: i === 0 ? "Nay" : dm(day), value: occupancyOn(day, list), today: i === 0 };
  });
  const mix = nightsByRoomType(list).slice(0, 5);
  const topNights = mix[0]?.[1] ?? 1;

  return (
    <>
      <div className={ops.head}><div><h1>Tổng quan</h1><p>{weekdayVi(today)}, {formatDate(today)}{totalRooms ? ` · ${totalRooms} phòng vật lý` : ""}</p></div></div>
      <div className={ops.tiles} style={{ marginBottom: 20 }}>
        <div className={ops.tile}><small>Công suất phòng hôm nay</small><b>{totalRooms ? `${Math.round(occ / totalRooms * 100)}%` : "—"}</b><span>{occ} / {totalRooms} phòng có khách</span></div>
        <div className={ops.tile}><small>Tiền phòng tháng {Number(month.slice(5))}</small><b>{shortVnd(roomRevenueForMonth(month, list, priceByType))}</b><span>các booking đã cọc & đã trả phòng</span></div>
        <div className={ops.tile}><small>Nhận phòng 7 ngày tới</small><b>{checkinsWithin(today, 7, list)}</b><span>booking đã cọc</span></div>
        <div className={`${ops.tile} ${ops.attn}`}><small>Yêu cầu dịch vụ đang chờ</small><b>{pendingService + pendingSupport}</b><span>{pendingService} nhà hàng/spa · {pendingSupport} hỗ trợ</span></div>
      </div>
      <div className={s["two-col"]}>
        <div className={s.card}>
          <div className={s["card-head"]}><h2>Số phòng có khách — 14 ngày tới</h2><span>trên tổng {totalRooms} phòng</span></div>
          <BarChart bars={bars} max={totalRooms} label="Biểu đồ số phòng có khách 14 ngày tới" />
        </div>
        <div className={s.card}>
          <div className={s["card-head"]}><h2>Hạng phòng được đặt nhiều</h2><span>theo số đêm</span></div>
          <div className={s.mix}>
            {mix.map(([type, nights]) => (
              <div key={type} className={s["mix-row"]}><span>{type}</span><b>{nights} đêm</b><div className={s["mix-bar"]}><i style={{ width: `${nights / topNights * 100}%` }} /></div></div>
            ))}
          </div>
        </div>
      </div>
      <div className={`${s.card} ${s.recent}`}>
        <div className={s["card-head"]}><h2>Đặt phòng mới nhất</h2><button type="button" className={s["link-btn"]} onClick={onAll}>Xem tất cả →</button></div>
        <div className={s["scroll-x"]}>
          <table className={ops.table}>
            <thead><tr><th>Mã</th><th>Khách</th><th>Hạng phòng</th><th>Lưu trú</th><th className={ops.right}>Tiền phòng</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {list.slice(0, 5).map(b => (
                <tr key={b.id}>
                  <td className={ops.num}>#{b.id}</td><td><span className={ops.t}>{b.guest_name}</span></td><td>{b.room_type}</td>
                  <td className={ops.num}>{dm(b.check_in)} – {dm(b.check_out)} · {nightsBetween(b.check_in, b.check_out)} đêm</td>
                  <td className={`${ops.num} ${ops.right}`}>{formatVnd(roomTotal(b))}</td>
                  <td><span className={`${ops.pill} ${pillClass(b.status)}`}>{ST[b.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function BookingsView({ bookings, roomTotal, notify, onChange, onRemove }: {
  bookings: Booking[]; roomTotal: (b: Booking) => number; notify: (t: string) => void;
  onChange: (id: number, status: BookingStatus) => void; onRemove: (id: number) => void;
}) {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const needle = q.trim().toLowerCase();
  const list = bookings.filter(b => (filter === "all" || b.status === filter)
    && (!needle || `${b.id} ${b.guest_name ?? ""} ${b.guest_phone ?? ""} ${b.room_id ?? ""}`.toLowerCase().includes(needle)));
  const filters: { key: BookingStatus | "all"; label: string }[] = [
    { key: "all", label: "Tất cả" }, { key: "paid", label: "Đã cọc" }, { key: "completed", label: "Đã trả phòng" }, { key: "cancelled", label: "Đã hủy" },
  ];

  const changeStatus = async (b: Booking, status: BookingStatus) => {
    try { await setBookingStatus(b.id, status); onChange(b.id, status); notify(`Đã đổi booking #${b.id} sang “${ST[status]}”`); }
    catch (e) { notify(errText(e)); }
  };
  const remove = async (id: number) => {
    setConfirmId(null);
    try { await deleteBooking(id); onRemove(id); notify("Đã xóa booking"); } catch (e) { notify(errText(e)); }
  };

  return (
    <>
      <div className={ops.head}><div><h1>Đặt phòng</h1><p>Toàn bộ booking · đổi trạng thái hoặc xóa</p></div></div>
      <div className={ops.toolbar}>
        <div className={ops.seg} role="group" aria-label="Lọc trạng thái booking">
          {filters.map(f => <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}
        </div>
        <label htmlFor="bq" hidden>Tìm booking</label>
        <input className={ops.search} id="bq" placeholder="Tìm tên, SĐT, số phòng, mã…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className={ops["table-wrap"]}>
        <table className={ops.table}>
          <thead><tr><th>Mã</th><th>Khách</th><th>Phòng</th><th>Lưu trú</th><th className={ops.right}>Tiền phòng</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className={ops["empty-row"]}>Không có booking khớp bộ lọc.</td></tr>}
            {list.map(b => (
              <tr key={b.id}>
                <td className={ops.num}>#{b.id}</td>
                <td><span className={ops.t}>{b.guest_name}</span><span className={`${ops.n} ${ops.num}`}>{b.guest_phone}</span></td>
                <td><span className={`${ops.t} ${ops.num}`}>{b.room_id ?? "—"}</span><span className={ops.n}>{b.room_type}</span></td>
                <td className={ops.num}>{dm(b.check_in)} – {dm(b.check_out)}<span className={ops.n} style={{ display: "block" }}>{nightsBetween(b.check_in, b.check_out)} đêm</span></td>
                <td className={`${ops.num} ${ops.right}`}>{formatVnd(roomTotal(b))}</td>
                <td>
                  <label htmlFor={`s${b.id}`} hidden>Trạng thái</label>
                  <select className={ops["select-sm"]} id={`s${b.id}`} value={b.status} onChange={e => { void changeStatus(b, e.target.value as BookingStatus); }}>
                    {(Object.keys(ST) as BookingStatus[]).map(k => <option key={k} value={k}>{ST[k]}</option>)}
                  </select>
                </td>
                <td>
                  <div className={ops["row-actions"]}>
                    {confirmId === b.id ? (
                      <>
                        <span className={ops.confirm}>Xóa hẳn booking và tài khoản khách?</span>
                        <button type="button" className={`${ops["btn-sm"]} ${ops["danger-solid"]}`} onClick={() => { void remove(b.id); }}>Xóa</button>
                        <button type="button" className={ops["btn-sm"]} onClick={() => setConfirmId(null)}>Thôi</button>
                      </>
                    ) : (
                      <button type="button" className={`${ops["btn-sm"]} ${ops.danger}`} onClick={() => setConfirmId(b.id)}>Xóa</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AccountsView({ accounts, me, notify, onChange, onNew }: {
  accounts: StaffAccount[]; me: string; notify: (t: string) => void; onChange: (a: StaffAccount[]) => void; onNew: () => void;
}) {
  const [confirmUser, setConfirmUser] = useState<string | null>(null);
  const revoke = async (u: string) => {
    setConfirmUser(null);
    try { await deleteStaffAccount(u); onChange(accounts.filter(a => a.username !== u)); notify(`Đã thu hồi tài khoản ${u}`); }
    catch (err) { notify(errText(err)); }
  };

  return (
    <>
      <div className={ops.head}>
        <div><h1>Tài khoản nhân viên</h1><p>{accounts.length} tài khoản · thu hồi khi nhân viên nghỉ việc</p></div>
        <button type="button" className={s.btn} onClick={onNew}>+ Tạo tài khoản</button>
      </div>
      <div className={ops["table-wrap"]}>
        <table className={ops.table} style={{ minWidth: 0 }}>
          <thead><tr><th>Tên đăng nhập</th><th>Vai trò</th><th>Ngày tạo</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.username}>
                <td><span className={ops.t}>{a.username}</span></td>
                <td><span className={`${ops.pill} ${ops[a.role]}`}>{a.role === "admin" ? "Quản trị" : "Nhân viên"}</span></td>
                <td className={ops.num}>{formatDate(a.created_at.slice(0, 10))}</td>
                <td className={ops.right}>
                  {a.username === me ? <span className={ops.n}>Tài khoản của bạn</span> : confirmUser === a.username ? (
                    <div className={ops["row-actions"]}>
                      <span className={ops.confirm}>Thu hồi tài khoản này?</span>
                      <button type="button" className={`${ops["btn-sm"]} ${ops["danger-solid"]}`} onClick={() => { void revoke(a.username); }}>Thu hồi</button>
                      <button type="button" className={ops["btn-sm"]} onClick={() => setConfirmUser(null)}>Thôi</button>
                    </div>
                  ) : (
                    <button type="button" className={`${ops["btn-sm"]} ${ops.danger}`} onClick={() => setConfirmUser(a.username)}>Thu hồi</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CreateAccountView({ accounts, notify, onCreated }: {
  accounts: StaffAccount[]; notify: (t: string) => void; onCreated: (a: StaffAccount) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u || password.length < 4) { setError("Nhập tên đăng nhập và mật khẩu tối thiểu 4 ký tự."); return; }
    if (accounts.some(a => a.username === u)) { setError(`Tên đăng nhập “${u}” đã tồn tại.`); return; }
    setSending(true); setError(null);
    try {
      onCreated(await createStaffAccount(u, password, role));
      notify(`Đã tạo tài khoản ${u}`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? `Tên đăng nhập “${u}” đã tồn tại.` : errText(err));
    } finally { setSending(false); }
  };

  return (
    <>
      <div className={ops.head}><div><h1>Tạo tài khoản</h1><p>Cấp tài khoản cho lễ tân hoặc quản trị viên mới</p></div></div>
      <div className={s.card} style={{ maxWidth: 520 }}>
        <form className={s.create} onSubmit={create} noValidate>
          <div className={s.field}><label htmlFor="u">Tên đăng nhập</label>
            <input className={s.control} id="u" autoComplete="off" placeholder="ví dụ: lantan2" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className={s.field}><label htmlFor="p">Mật khẩu ban đầu</label>
            <input className={s.control} id="p" type="text" autoComplete="off" placeholder="Tối thiểu 4 ký tự" value={password} onChange={e => setPassword(e.target.value)} />
            <span className={s.hint}>Nhân viên tự đổi sau lần đăng nhập đầu.</span></div>
          <div className={s.field}><span className={s.lbl}>Vai trò</span>
            <div className={s.radio}>
              <input type="radio" name="role" id="r-staff" checked={role === "staff"} onChange={() => setRole("staff")} /><label htmlFor="r-staff">Nhân viên</label>
              <input type="radio" name="role" id="r-admin" checked={role === "admin"} onChange={() => setRole("admin")} /><label htmlFor="r-admin">Quản trị</label>
            </div></div>
          {error && <span className={s.err} role="alert">{error}</span>}
          <button className={s.btn} type="submit" disabled={sending}>{sending ? "Đang tạo…" : "Tạo tài khoản"}</button>
        </form>
      </div>
    </>
  );
}
