import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMe, logout as apiLogout, type Identity } from "./api";

interface AuthContextValue {
  auth: Identity | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const identity = await fetchMe();
    setAuth(identity);
  }

  async function logout() {
    await apiLogout();
    setAuth(null);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
  return ctx;
}
