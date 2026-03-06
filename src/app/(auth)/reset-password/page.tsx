"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { resetPassword } from "@/shared/api";

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordForm() {
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
      setError(`Пароль не менее ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (!tokenFromUrl) {
      setError("Нет токена сброса. Перейдите по ссылке из письма.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(tokenFromUrl, newPassword);
      setSuccess(true);
      setTimeout(() => router.push(ROUTES.login), 2000);
    } catch (err) {
      setError((err as Error)?.message ?? "Не удалось сменить пароль. Ссылка могла истечь.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-strong)]">
          Пароль успешно изменён. Перенаправляем на страницу входа…
        </div>
        <Link className="auth-primary inline-block w-full text-center" href={ROUTES.login}>
          Войти
        </Link>
      </div>
    );
  }

  if (!tokenFromUrl) {
    return (
      <div className="space-y-3">
        <div className="alert alert-warn">
          Ссылка для сброса пароля недействительна или отсутствует. Запросите новую ссылку на странице восстановления пароля.
        </div>
        <Link className="auth-primary inline-block w-full text-center" href={ROUTES.forgotPassword}>
          Восстановить пароль
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="auth-field">
        <span>Новый пароль (не менее {MIN_PASSWORD_LENGTH} символов)</span>
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
        <span>Повторите пароль</span>
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
      <button
        className="auth-primary w-full"
        type="submit"
        disabled={loading}
      >
        {loading ? "Сохранение…" : "Сохранить пароль"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Новый пароль"
      subtitle="Введите новый пароль для входа в аккаунт"
      helperText="Перейдите по ссылке из письма и задайте пароль не менее 8 символов."
    >
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Загрузка…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        <Link className="font-semibold text-[var(--ink-strong)]" href={ROUTES.login}>
          Вернуться ко входу
        </Link>
      </p>
    </AuthShell>
  );
}
