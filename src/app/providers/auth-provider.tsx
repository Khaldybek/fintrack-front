"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { ApiUser } from "@/shared/api";
import {
  getCurrentAccessToken,
  getAccessTokenFromResponse,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refresh,
  setAccessToken,
} from "@/shared/api";
import { ROUTES } from "@/shared/config";

type AuthState = {
  user: ApiUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (accessToken: string, user: ApiUser) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Токены не храним в localStorage (best practice). Access token — только в памяти, refresh — в httpOnly cookie на бэкенде. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setSession = useCallback((token: string, user: ApiUser) => {
    setAccessToken(token);
    setState({
      user,
      accessToken: token,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setState({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin({ email, password });
      const token = getAccessTokenFromResponse(res);
      setSession(token, res.user);
      router.push(ROUTES.home);
    },
    [router, setSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearSession();
      router.push(ROUTES.login);
    }
  }, [router, clearSession]);

  useEffect(() => {
    refresh()
      .then((res) => {
        setSession(getAccessTokenFromResponse(res), res.user);
      })
      .catch(async () => {
        // iOS/Safari может блокировать refresh-cookie в cross-site сценариях.
        // Если access token уже есть в sessionStorage, пробуем восстановить сессию через GET /me.
        const token = getCurrentAccessToken();
        if (!token) {
          clearSession();
          return;
        }
        try {
          const me = await getMe();
          setSession(token, me);
        } catch {
          clearSession();
        }
      })
      .finally(() => {
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, [setSession, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setSession,
      clearSession,
    }),
    [state, login, logout, setSession, clearSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
