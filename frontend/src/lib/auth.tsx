import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getMe, login as apiLogin, logout as apiLogout, type Me } from "./api";
import { homeForRole, type Role } from "./booking";

type AuthCtx = {
  me: Me | null | undefined;          // undefined = đang kiểm tra phiên
  signIn: (body: Parameters<typeof apiLogin>[0]) => Promise<Me>;
  signOut: () => Promise<void>;
  refresh: () => void;
};
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const refresh = useCallback(() => {
    getMe().then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(refresh, [refresh]);
  const signIn = useCallback(async (body: Parameters<typeof apiLogin>[0]) => { const m = await apiLogin(body); setMe(m); return m; }, []);
  const signOut = useCallback(async () => { try { await apiLogout(); } finally { setMe(null); } }, []);
  return <Ctx.Provider value={{ me, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook đi kèm provider
export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return c;
}

/** Chặn route theo vai trò: chưa đăng nhập → /dang-nhap; sai vai trò → trang chủ của vai trò đó. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me } = useAuth();
  if (me === undefined) return null;
  if (me === null) return <Navigate to="/dang-nhap" replace />;
  if (!roles.includes(me.role)) return <Navigate to={homeForRole(me.role)} replace />;
  return <>{children}</>;
}
