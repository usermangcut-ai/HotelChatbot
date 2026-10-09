import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { HOTLINE } from "../content";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { homeForRole } from "../lib/booking";
import s from "./Login.module.css";
import { imageUrl } from "../lib/assets";

type Kind = "guest" | "staff";
const COPY: Record<Kind, { sub: string; help: string }> = {
  guest: { sub: "Dành cho khách đang lưu trú tại resort.", help: "Quên mật khẩu hoặc chưa nhận được mật khẩu? Gọi lễ tân 24/24:" },
  staff: { sub: "Dành cho nhân viên và quản trị viên.", help: "Quên mật khẩu? Liên hệ quản trị viên hoặc lễ tân:" },
};
const FALLBACK_IMG = imageUrl("hotel.jpg");

function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4M8 11v.5"/></svg>;
}

function PasswordInput({ id, value, onChange, invalid, placeholder }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={s.input}>
      <input id={id} type={show ? "text" : "password"} autoComplete="current-password" placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} aria-invalid={invalid || undefined} />
      <button type="button" className={s.reveal} onClick={() => setShow(v => !v)} aria-controls={id}>{show ? "Ẩn" : "Hiện"}</button>
    </div>
  );
}

export default function Login() {
  const { me, signIn } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>("guest");
  const [roomId, setRoomId] = useState("");
  const [guestPw, setGuestPw] = useState("");
  const [username, setUsername] = useState("");
  const [staffPw, setStaffPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState(imageUrl("login.jpg"));   // chưa có ảnh dọc login.jpg → dùng ảnh toàn cảnh

  if (me) return <Navigate to={homeForRole(me.role)} replace />;

  const select = (k: Kind) => { setKind(k); setError(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = kind === "guest"
      ? { identity_type: "guest" as const, room_id: roomId.trim(), password: guestPw }
      : { identity_type: "staff" as const, username: username.trim(), password: staffPw };
    if (!(kind === "guest" ? body.room_id : username.trim()) || !body.password) {
      setError(kind === "guest" ? "Nhập số phòng và mật khẩu." : "Nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setBusy(true);
    try {
      const m = await signIn(body);
      navigate(homeForRole(m.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chưa kết nối được tới hệ thống. Thử lại giúp em.");
      setBusy(false);
    }
  };

  const invalid = error !== null;
  const alert = (
    <div className={`${s.alert} ${error ? s.show : ""}`} role="alert">
      {error && <><AlertIcon /><span>{error}</span></>}
    </div>
  );
  const submitBtn = (
    <button className={s.btn} type="submit" disabled={busy}><span className={s.spinner} /><span>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</span></button>
  );

  return (
    <div className={s.shell}>
      <div className={s.visual}>
        <img src={img} alt="Khaifrost Resort lúc hoàng hôn" onError={() => { if (img !== FALLBACK_IMG) setImg(FALLBACK_IMG); }} />
        <div className={s["visual-copy"]}>
          <Link className={s.wordmark} to="/">Khaifrost Resort</Link>
          <p>Chào mừng trở lại. Mọi yêu cầu trong kỳ nghỉ, chỉ cách một lần chạm.</p>
        </div>
      </div>

      <div className={s.side}>
        <div className={s["side-top"]}>
          <Link className={s.wordmark} to="/">Khaifrost Resort</Link>
          <Link to="/">← Về trang chủ</Link>
        </div>

        <div className={s["form-wrap"]}>
          <div className={s["form-card"]}>
            <h1>Đăng nhập</h1>
            <p className={s.sub}>{COPY[kind].sub}</p>

            <div className={s.tabs} role="tablist" aria-label="Loại tài khoản">
              <button type="button" className={s.tab} role="tab" id="tab-guest" aria-selected={kind === "guest"} aria-controls="panel-guest" onClick={() => select("guest")}>Khách lưu trú</button>
              <button type="button" className={s.tab} role="tab" id="tab-staff" aria-selected={kind === "staff"} aria-controls="panel-staff" onClick={() => select("staff")}>Nhân viên</button>
            </div>

            <form id="panel-guest" role="tabpanel" aria-labelledby="tab-guest" noValidate hidden={kind !== "guest"} onSubmit={submit}>
              {kind === "guest" && alert}
              <div className={s.field}>
                <label htmlFor="room">Số phòng</label>
                <div className={s.input}><input id="room" inputMode="text" autoComplete="username" placeholder="Ví dụ: 201 hoặc V03"
                  value={roomId} onChange={e => setRoomId(e.target.value)} aria-invalid={invalid || undefined} /></div>
              </div>
              <div className={s.field}>
                <label htmlFor="guest-pw">Mật khẩu</label>
                <PasswordInput id="guest-pw" value={guestPw} onChange={setGuestPw} invalid={invalid} placeholder="Mật khẩu được cấp khi đặt phòng" />
                <span className={s.hint}>Tài khoản dùng được từ ngày nhận phòng đến ngày trả phòng.</span>
              </div>
              {submitBtn}
            </form>

            <form id="panel-staff" role="tabpanel" aria-labelledby="tab-staff" noValidate hidden={kind !== "staff"} onSubmit={submit}>
              {kind === "staff" && alert}
              <div className={s.field}>
                <label htmlFor="username">Tên đăng nhập</label>
                <div className={s.input}><input id="username" autoComplete="username" placeholder="Tên đăng nhập do quản trị cấp"
                  value={username} onChange={e => setUsername(e.target.value)} aria-invalid={invalid || undefined} /></div>
              </div>
              <div className={s.field}>
                <label htmlFor="staff-pw">Mật khẩu</label>
                <PasswordInput id="staff-pw" value={staffPw} onChange={setStaffPw} invalid={invalid} />
              </div>
              {submitBtn}
            </form>

            <div className={s.help}>
              <span>{COPY[kind].help}</span>
              <strong>{HOTLINE}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
