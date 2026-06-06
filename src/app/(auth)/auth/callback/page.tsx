"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import { parseOAuthRedirectLocation, parseOAuthUser } from "@/shared/lib";

/**
 * Страница приёма редиректа после Google OAuth.
 */
export default function AuthCallbackPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const doneRef = useRef(false);
  const applyRef = useRef<(loc: Location) => void>(() => {});

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
            [parsed.oauthError, desc].filter(Boolean).join(": ") ||
              t("auth.callback.oauthRejected"),
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
        setErrorDetail(t("auth.callback.invalidProfile"));
        setStatus("error");
      }
    };

    applyRef.current = applyRedirect;

    applyRedirect(window.location);
    const t1 = window.setTimeout(() => applyRedirect(window.location), 0);
    const t2 = window.setTimeout(() => applyRedirect(window.location), 100);
    const t3 = window.setTimeout(() => applyRedirect(window.location), 300);
    const t4 = window.setTimeout(() => {
      if (doneRef.current) return;
      const parsed = parseOAuthRedirectLocation(window.location);
      if (!parsed.ok && parsed.reason === "missing") {
        doneRef.current = true;
        setErrorDetail(t("auth.callback.missingHint"));
        setStatus("error");
      }
    }, 600);

    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) {
        applyRef.current(window.location);
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [setSession, t]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-[var(--ink-soft)]">{t("auth.callback.error")}</p>
        {errorDetail ? (
          <p className="max-w-md text-center text-xs text-[var(--ink-muted)]">{errorDetail}</p>
        ) : null}
        <button
          type="button"
          className="action-btn"
          onClick={() => router.push(ROUTES.login)}
        >
          {t("auth.callback.toLogin")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-[var(--ink-muted)]">{t("auth.callback.loading")}</p>
    </div>
  );
}
