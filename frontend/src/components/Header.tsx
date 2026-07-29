import { Waves } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const ROLE_LINK: Record<string, { to: string; label: string }> = {
  admin: { to: "/quan-tri", label: "Quản trị" },
  staff: { to: "/nhan-vien", label: "Nhân viên" },
  guest: { to: "/tai-khoan", label: "Tài khoản" },
};

export default function Header() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/dang-nhap");
  }

  return (
    <header className="bg-primary-dark text-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-serif-display text-lg tracking-widest uppercase">
          <span className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
            <Waves className="w-4 h-4 text-primary-dark" />
          </span>
          Shanghai Resort
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-wider">
          <Link to="/" className="hover:text-gold">
            Lễ tân ảo
          </Link>
          <Link to="/dat-phong" className="hover:text-gold">
            Đặt phòng
          </Link>
          <Link to="/dich-vu" className="hover:text-gold">
            Nhà hàng &amp; Spa
          </Link>
          {auth ? (
            <>
              <Link to={ROLE_LINK[auth.role].to} className="hover:text-gold">
                {ROLE_LINK[auth.role].label}
              </Link>
              <button onClick={handleLogout} className="text-gold hover:underline">
                Đăng xuất ({auth.identity_id})
              </button>
            </>
          ) : (
            <Link to="/dang-nhap" className="text-gold hover:underline">
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
