"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { resetPassword } from "@/shared/api";
import { useI18n } from "@/shared/i18n";

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        t("auth.resetPassword.minLength").replace("{min}", String(MIN_PASSWORD_LENGTH)),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.resetPassword.mismatch"));
      return;
    }
    if (!tokenFromUrl) {
      setError(t("auth.resetPassword.noToken"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(tokenFromUrl, newPassword);
      setSuccess(true);
      setTimeout(() => router.push(ROUTES.login), 2000);
    } catch (err) {
      setError((err as Error)?.message ?? t("auth.resetPassword.changeError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-strong)]">
          {t("auth.resetPassword.success")}
        </div>
        <Link className="auth-primary inline-block w-full text-center" href={ROUTES.login}>
          {t("auth.resetPassword.login")}
        </Link>
      </div>
    );
  }

  if (!tokenFromUrl) {
    return (
      <div className="space-y-3">
        <div className="alert alert-warn">{t("auth.resetPassword.invalidLink")}</div>
        <Link className="auth-primary inline-block w-full text-center" href={ROUTES.forgotPassword}>
          {t("auth.resetPassword.requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="auth-field">
        <span>
          {t("auth.resetPassword.newPassword").replace(
            "{min}",
            String(MIN_PASSWORD_LENGTH),
          )}
        </span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      <label className="auth-field">
        <span>{t("auth.resetPassword.confirmPassword")}</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </label>
      {error && <div className="alert alert-warn">{error}</div>}
      <button className="auth-primary w-full" type="submit" disabled={loading}>
        {loading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();

  return (
    <AuthShell
      title={t("auth.resetPassword.title")}
      subtitle={t("auth.resetPassword.subtitle")}
      helperText={t("auth.resetPassword.helper")}
    >
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        <Link className="font-semibold text-[var(--ink-strong)]" href={ROUTES.login}>
          {t("auth.resetPassword.backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
