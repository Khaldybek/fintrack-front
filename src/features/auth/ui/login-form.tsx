"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { useAuth } from "@/app/providers/auth-provider";
import { getGoogleAuthUrl } from "@/shared/api";
import type { ApiError } from "@/shared/api";

export function LoginForm() {
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
        setError("Доступ ограничен тарифом Free.");
      } else {
        setError(apiErr.message || "Ошибка входа. Проверьте email и пароль.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = getGoogleAuthUrl();
  }

  return (
    <AuthShell
      title="Вход"
      subtitle="Продолжите работу с вашими финансами"
      helperText="FinTrack помогает держать деньги в порядке: от транзакций до прогнозов ликвидности."
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
          <span>Email</span>
          <input
            placeholder="name@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-field">
          <span>Пароль</span>
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
            Запомнить меня
          </label>
          <Link
            className="text-sm font-semibold text-[var(--ink-soft)]"
            href={ROUTES.forgotPassword}
          >
            Забыли пароль?
          </Link>
        </div>

        <button
          className="auth-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Вход…" : "Войти"}
        </button>

        <button
          className="auth-google"
          type="button"
          onClick={handleGoogle}
        >
          <span className="mono text-xs">G</span> Войти через Google
        </button>
      </form>

      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        Нет аккаунта?{" "}
        <Link className="font-semibold" href={ROUTES.register}>
          Зарегистрироваться
        </Link>
      </p>
    </AuthShell>
  );
}
