"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers/auth-provider";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { forgotPassword } from "@/shared/api";
import { useI18n } from "@/shared/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError(t("auth.forgotPassword.emailRequired"));
      return;
    }
    if (value.length < 5 || value.length > 255) {
      setError(t("auth.forgotPassword.emailLength"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (err) {
      setError((err as Error)?.message ?? t("auth.forgotPassword.sendError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      helperText={t("auth.forgotPassword.helper")}
    >
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-strong)]">
            {t("auth.forgotPassword.success")}
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            {t("auth.forgotPassword.resendPrompt")}{" "}
            <button
              type="button"
              className="font-semibold text-[var(--ink-strong)] underline"
              onClick={() => setSent(false)}
            >
              {t("auth.forgotPassword.resend")}
            </button>{" "}
            {t("auth.forgotPassword.resendLimit")}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="auth-field">
            <span>{t("auth.forgotPassword.emailLabel")}</span>
            <input
              placeholder="name@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              minLength={5}
              maxLength={255}
              required
            />
          </label>
          {error && <div className="alert alert-warn">{error}</div>}
          <button className="auth-primary w-full" type="submit" disabled={loading}>
            {loading
              ? t("auth.forgotPassword.submitting")
              : t("auth.forgotPassword.submit")}
          </button>
        </form>
      )}
      <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
        {isAuthenticated && (
          <p>
            <Link
              className="font-semibold text-[var(--ink-strong)] underline decoration-[var(--line)] underline-offset-2 hover:decoration-[var(--ink-strong)]"
              href={ROUTES.profile}
            >
              {t("auth.forgotPassword.backToProfile")}
            </Link>
          </p>
        )}
        <p>
          {t("auth.forgotPassword.rememberPassword")}{" "}
          <Link className="font-semibold text-[var(--ink-strong)]" href={ROUTES.login}>
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
