import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/useToast";
import ChangePasswordDrawer from "./ChangePasswordDrawer";
import s from "./OpsLayout.module.css";
import Toast from "./Toast";

export type OpsNavItem = { key: string; label: string; short?: string; icon: ReactNode; count?: number };
type Props = {
  subtitle: string;
  nav: OpsNavItem[];
  active: string;
  onSelect: (key: string) => void;
  mobile: "bar" | "tabs";   // bar = thanh trên cùng (nhân viên) · tabs = dải tab cuộn ngang (quản trị)
  children: ReactNode;
};

export default function OpsLayout({ subtitle, nav, active, onSelect, mobile, children }: Props) {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [pwOpen, setPwOpen] = useState(false);
  const closePw = useCallback(() => setPwOpen(false), []);

  const username = me?.identity_id ?? "";
  const isAdmin = me?.role === "admin";
  const logout = async () => { await signOut(); navigate("/dang-nhap"); };
  const pick = (key: string) => (e: { preventDefault(): void }) => { e.preventDefault(); onSelect(key); };

  return (
    <div className={s.app}>
      <aside className={s.side}>
        <Link className={s.wordmark} to="/">Shanghai Resort</Link>
        <div className={s.role}>{subtitle}</div>
        <nav className={s.menu} aria-label="Điều hướng">
          {nav.map(n => (
            <a key={n.key} href="#" aria-current={n.key === active ? "page" : undefined} onClick={pick(n.key)}>
              {n.icon}{n.label}{n.count !== undefined && <span className={s.count}>{n.count}</span>}
            </a>
          ))}
        </nav>
        <div className={s["side-foot"]}>
          <div className={s.me}>
            <span className={`${s.av} ${isAdmin ? s.admin : ""}`}>{username.slice(0, 2).toUpperCase()}</span>
            <div><b>{username}</b><small>{isAdmin ? "Quản trị viên" : "Nhân viên"}</small></div>
          </div>
          <button type="button" onClick={() => setPwOpen(true)}>Đổi mật khẩu</button>
          <button type="button" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>

      <div>
        {mobile === "bar" ? (
          <div className={s["mobile-bar"]}>
            <Link className={s.wordmark} to="/">Shanghai Resort</Link>
            <div className={s.actions}>
              <button type="button" onClick={() => setPwOpen(true)}>Đổi mật khẩu</button>
              <button type="button" onClick={logout}>{username} · Đăng xuất</button>
            </div>
          </div>
        ) : (
          <nav className={s["mobile-tabs"]} aria-label="Điều hướng (di động)">
            {nav.map(n => (
              <a key={n.key} href="#" aria-current={n.key === active ? "page" : undefined} onClick={pick(n.key)}>{n.short ?? n.label}</a>
            ))}
            <button type="button" onClick={() => setPwOpen(true)}>Đổi mật khẩu</button>
            <button type="button" onClick={logout}>Đăng xuất</button>
          </nav>
        )}
        <main className={s.main}>{children}</main>
      </div>

      <ChangePasswordDrawer open={pwOpen} onClose={closePw} onDone={() => { closePw(); toast.show("Đã đổi mật khẩu"); }} />
      <Toast text={toast.text} />
    </div>
  );
}
