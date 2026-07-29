import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function ProtectedRoute({
  role,
  children,
}: {
  role: "admin" | "staff" | "guest";
  children: ReactNode;
}) {
  const { auth, loading } = useAuth();

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6 text-sm text-gray-500">Đang kiểm tra đăng nhập...</div>;
  }
  if (!auth) {
    return <Navigate to="/dang-nhap" replace />;
  }
  const allowed = auth.role === role || (role === "staff" && auth.role === "admin");
  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto p-10 text-center text-sm text-gray-500">
        Tài khoản của quý khách không có quyền truy cập trang này.
      </div>
    );
  }
  return <>{children}</>;
}
