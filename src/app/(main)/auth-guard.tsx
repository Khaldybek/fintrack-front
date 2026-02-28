"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { ROUTES } from "@/shared/config";

type AuthGuardProps = { children: React.ReactNode };

/**
 * Не рендерит защищённый контент и не даёт слать запросы, пока не проверена сессия (refresh).
 * Убирает 401 из-за гонки: запросы уходят только после появления токена или редиректа на логин.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-1)]">
        <div className="text-center">
          <p className="metric-label">Загрузка сессии…</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Проверка авторизации
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
