"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/shared/i18n";
import { getGoogleAuthUrl } from "@/shared/api";
import type { ApiError } from "@/shared/api";

export function LoginForm() {
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [featureHint, setFeatureHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFeatureHint(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403 && apiErr.upgradeHint) {
        setFeatureHint(apiErr.upgradeHint);
        setError(t("auth.login.errorFree"));
      } else {
        setError(apiErr.message || t("auth.login.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  }

  const googleAuthUrl = getGoogleAuthUrl();

  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      helperText={t("auth.login.helper")}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-[#b91c1c] bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
            {error}
            {featureHint && (
              <p className="mt-1 font-medium">{featureHint}</p>
            )}
          </div>
        )}
        <label className="auth-field">
          <span>{t("auth.login.email")}</span>
          <input
            placeholder="name@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-field">
          <span>{t("auth.login.password")}</span>
          <input
            placeholder="Введите пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <input type="checkbox" />
            {t("auth.login.remember")}
          </label>
          <Link
            className="text-sm font-semibold text-[var(--ink-strong)] hover:underline"
            href={ROUTES.forgotPassword}
          >
            {t("auth.login.forgot")}
          </Link>
        </div>

        <button
          className="auth-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </form>

      {/* Ссылка <a>, не JS-навигация: надёжнее в iOS Safari и не ломается во встроенных браузерах */}
      <a className="auth-google mt-3" href={googleAuthUrl}>
        <span className="mono text-xs">G</span> {t("auth.login.google")}
      </a>

      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        {t("auth.login.noAccount")}{" "}
        <Link className="font-semibold" href={ROUTES.register}>
          {t("auth.login.register")}
        </Link>
      </p>
    </AuthShell>
  );
}
