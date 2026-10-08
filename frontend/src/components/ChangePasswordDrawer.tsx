import { useEffect, useState, type FormEvent } from "react";
import { ApiError, changePassword } from "../lib/api";
import s from "./ChangePasswordDrawer.module.css";

type Props = { open: boolean; onClose: () => void; onDone: () => void };

export default function ChangePasswordDrawer({ open, onClose, onDone }: Props) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOldPw(""); setNewPw(""); setAgain(""); setError(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!oldPw) { setError("Nhập mật khẩu hiện tại."); return; }
    if (newPw.length < 4) { setError("Mật khẩu mới tối thiểu 4 ký tự."); return; }
    if (newPw !== again) { setError("Hai lần nhập mật khẩu mới chưa khớp."); return; }
    setSending(true); setError(null);
    try {
      await changePassword(oldPw, newPw);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError
        ? (err.status === 401 ? "Mật khẩu hiện tại không đúng." : err.message)
        : "Chưa kết nối được tới hệ thống. Thử lại giúp em.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className={`${s.scrim} ${open ? s.open : ""}`} onClick={onClose} />
      <aside className={`${s.drawer} ${open ? s.open : ""}`} role="dialog" aria-labelledby="pw-title" aria-hidden={!open} inert={!open}>
        <div className={s["drawer-head"]}>
          <b id="pw-title">Đổi mật khẩu</b>
          <button type="button" className={s["icon-btn"]} aria-label="Đóng" onClick={onClose}>✕</button>
        </div>
        <form className={s.sheet} id="pw-form" onSubmit={submit} noValidate>
          <div className={s.field}><label htmlFor="pw-old">Mật khẩu hiện tại</label>
            <input className={s.control} id="pw-old" type="password" autoComplete="current-password" value={oldPw} onChange={e => setOldPw(e.target.value)} /></div>
          <div className={s.field}><label htmlFor="pw-new">Mật khẩu mới</label>
            <input className={s.control} id="pw-new" type="password" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            <span className={s.hint}>Tối thiểu 4 ký tự.</span></div>
          <div className={s.field}><label htmlFor="pw-again">Nhập lại mật khẩu mới</label>
            <input className={s.control} id="pw-again" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} /></div>
          {error && <div className={s["form-error"]} role="alert">{error}</div>}
        </form>
        <div className={s["sheet-foot"]}><button className={s.btn} form="pw-form" type="submit" disabled={sending}>{sending ? "Đang lưu…" : "Đổi mật khẩu"}</button></div>
      </aside>
    </>
  );
}
