"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { ROUTES } from "@/shared/config";

/**
 * Страница приёма редиректа после Google OAuth.
 * Бэкенд редиректит на FRONTEND_URL#access_token=...&expires_in=...&user=...
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) {
      setStatus("error");
      return;
    }
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const userStr = params.get("user");
    if (!accessToken || !userStr) {
      setStatus("error");
      return;
    }
    try {
      const user = JSON.parse(decodeURIComponent(userStr)) as {
        id: string;
        email: string;
        name?: string | null;
      };
      setSession(accessToken, user);
      setStatus("ok");
      window.location.replace(ROUTES.home);
    } catch {
      setStatus("error");
    }
  }, [setSession]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-[var(--ink-soft)]">
          Не удалось войти через Google. Попробуйте снова.
        </p>
        <button
          type="button"
          className="action-btn"
          onClick={() => router.push(ROUTES.login)}
        >
          К странице входа
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-[var(--ink-muted)]">Вход через Google…</p>
    </div>
  );
}
