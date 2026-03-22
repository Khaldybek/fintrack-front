"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { ROUTES } from "@/shared/config";
import { parseOAuthRedirectLocation, parseOAuthUser } from "@/shared/lib";

/**
 * Страница приёма редиректа после Google OAuth.
 * Бэкенд редиректит на FRONTEND_URL с токенами в hash (#access_token=...) или в query (?access_token=...).
 * На iPhone часто приходит именно query — см. parseOAuthRedirectLocation.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyRedirect = (loc: Location) => {
      if (doneRef.current) return;

      const parsed = parseOAuthRedirectLocation(loc);
      if (!parsed.ok) {
        if (parsed.reason === "oauth_error") {
          doneRef.current = true;
          const desc = parsed.oauthErrorDescription
            ? decodeURIComponent(parsed.oauthErrorDescription.replace(/\+/g, " "))
            : "";
          setErrorDetail(
            [parsed.oauthError, desc].filter(Boolean).join(": ") || "OAuth отклонён",
          );
          setStatus("error");
          return;
        }
        return;
      }

      try {
        const user = parseOAuthUser(parsed.userRaw);
        doneRef.current = true;
        setSession(parsed.accessToken, user);
        setStatus("ok");
        window.location.replace(ROUTES.home);
      } catch {
        doneRef.current = true;
        setErrorDetail("Некорректные данные профиля в ответе OAuth.");
        setStatus("error");
      }
    };

    // Сразу и с задержкой: в iOS Safari иногда hash/query доступны не в первый тик после редиректа.
    applyRedirect(window.location);
    const t1 = window.setTimeout(() => applyRedirect(window.location), 0);
    const t2 = window.setTimeout(() => applyRedirect(window.location), 100);
    const t3 = window.setTimeout(() => {
      if (doneRef.current) return;
      const parsed = parseOAuthRedirectLocation(window.location);
      if (!parsed.ok && parsed.reason === "missing") {
        doneRef.current = true;
        setStatus("error");
      }
    }, 500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [setSession]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-[var(--ink-soft)]">
          Не удалось войти через Google. Попробуйте снова.
        </p>
        {errorDetail ? (
          <p className="max-w-md text-center text-xs text-[var(--ink-muted)]">{errorDetail}</p>
        ) : null}
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
