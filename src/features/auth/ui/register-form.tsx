"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import type { ApiError } from "@/shared/api";
import {
  register as apiRegister,
  getAccessTokenFromResponse,
  getGoogleAuthUrl,
} from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { AuthShell } from "@/shared/ui";
import { TelegramOauthHint } from "./telegram-oauth-hint";

export function RegisterForm() {
  const { setSession } = useAuth();
  const [name, setName] = useState("");
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
      const res = await apiRegister({
        email,
        password,
        name: name.trim() || undefined,
      });
      setSession(getAccessTokenFromResponse(res), res.user);
      window.location.href = ROUTES.home;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403 && apiErr.upgradeHint) {
        setFeatureHint(apiErr.upgradeHint);
        setError("Регистрация ограничена.");
      } else {
        setError(apiErr.message || "Ошибка регистрации. Попробуйте снова.");
      }
    } finally {
      setLoading(false);
    }
  }

  const googleAuthUrl = getGoogleAuthUrl();

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт и начните вести финансы осознанно"
      helperText="Первый шаг занимает меньше минуты. После регистрации вы сможете добавить счета и получить стартовый индекс."
    >
      <form action="#" className="space-y-3" onSubmit={handleSubmit}>
        <TelegramOauthHint />
        {error && (
          <div className="rounded-xl border border-[#b91c1c] bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
            {error}
            {featureHint && <p className="mt-1 font-medium">{featureHint}</p>}
          </div>
        )}
        <label className="auth-field">
          <span>Имя</span>
          <input
            placeholder="Ваше имя"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            placeholder="name@email.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-field">
          <span>Пароль</span>
          <input
            placeholder="Минимум 8 символов"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className="inline-flex items-center gap-2 pt-1 text-sm text-[var(--ink-soft)]">
          <input type="checkbox" />
          Принимаю условия и политику конфиденциальности
        </label>

        <button className="auth-primary" type="submit" disabled={loading}>
          {loading ? "Создание…" : "Создать аккаунт"}
        </button>
      </form>

      <a className="auth-google mt-3" href={googleAuthUrl}>
        <span className="mono text-xs">G</span> Продолжить через Google
      </a>

      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        Уже есть аккаунт?{" "}
        <Link className="font-semibold" href={ROUTES.login}>
          Войти
        </Link>
      </p>
    </AuthShell>
  );
}
