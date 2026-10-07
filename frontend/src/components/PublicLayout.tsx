import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { homeForRole } from "../lib/booking";
import ui from "./ui.module.css";
import s from "./PublicLayout.module.css";

export default function PublicLayout({ children, onOpenChat }: { children: ReactNode; onOpenChat: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { me } = useAuth();
  // Nút đầu trang: chưa đăng nhập → Đăng nhập; khách → Tài khoản; nhân viên/quản trị → Bảng điều phối
  const account = me ? { to: homeForRole(me.role), label: me.role === "guest" ? "Tài khoản" : "Bảng điều phối" } : { to: "/dang-nhap", label: "Đăng nhập" };
  const accountTab = me?.role === "guest" ? "/tai-khoan" : "/dang-nhap";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`${s.top} ${scrolled ? s.scrolled : ""}`}>
        <div className="wrap">
          <Link className={s.brand} to="/"><span className={s["brand-name"]}>Shanghai Resort</span></Link>
          <nav className={s.main} aria-label="Điều hướng chính">
            <a href="/#phong">Hạng phòng</a>
            <a href="/#tien-ich">Tiện ích</a>
            <a href="/#lien-he">Liên hệ</a>
          </nav>
          <Link className={`${ui.btn} ${ui["btn-ghost"]} ${s.login}`} to={account.to}>{account.label}</Link>
        </div>
      </header>

      {children}

      <footer className={s.foot}>
        <div className="wrap">
          <span>© Shanghai Resort · Khai trương 2003, cải tạo 2016 · 533 phòng</span>
          <span>Nhân viên &amp; quản trị: <Link to="/dang-nhap">đăng nhập</Link></span>
        </div>
      </footer>

      <nav className={s.tabbar} aria-label="Điều hướng di động">
        <Link to="/" aria-current={pathname === "/" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>Trang chủ
        </Link>
        <button type="button" data-open-chat onClick={onOpenChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h16v11H8l-4 4z"/></svg>Chat
        </button>
        <Link to="/dat-phong" aria-current={pathname === "/dat-phong" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Đặt phòng
        </Link>
        <Link to={accountTab} aria-current={pathname === accountTab ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>Tài khoản
        </Link>
      </nav>
    </>
  );
}
