import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { homeForRole } from "../lib/booking";
import s from "./PublicLayout.module.css";

export default function PublicLayout({ children, overlay = false }: { children: ReactNode; overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const { me } = useAuth();
  // Nút góc phải: chưa đăng nhập → Đăng nhập; khách → Tài khoản; nhân viên/quản trị → Bảng điều phối
  const account = me ? { to: homeForRole(me.role), label: me.role === "guest" ? "Tài khoản" : "Bảng điều phối" } : { to: "/dang-nhap", label: "Đăng nhập" };
  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight - 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);
  const solid = !overlay || scrolled;

  return (
    <>
      <header className={`${s.top} ${overlay ? s.overlay : ""} ${solid ? s.solid : ""}`}>
        <div className={`wrap ${s.bar}`}>
          <Link className={s.brand} to="/" aria-label="Shanghai Resort">
            <svg viewBox="0 0 52 52" fill="none" stroke="currentColor"><circle cx="26" cy="26" r="24.5" strokeWidth="1" /><text x="26" y="31.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="16" fontWeight="300" letterSpacing="2" fontFamily="Be Vietnam Pro, system-ui, sans-serif">SR</text></svg>
            <b>Shanghai Resort</b>
          </Link>
          <Link className={s.login} to={account.to}>{account.label}</Link>
        </div>
      </header>

      {children}

      <footer className={s.foot}>© Shanghai Resort · Khai trương 2003, cải tạo 2016</footer>
    </>
  );
}
