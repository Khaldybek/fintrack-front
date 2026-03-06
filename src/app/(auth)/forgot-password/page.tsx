"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { forgotPassword } from "@/shared/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError("Введите email");
      return;
    }
    if (value.length < 5 || value.length > 255) {
      setError("Email от 5 до 255 символов");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (err) {
      setError((err as Error)?.message ?? "Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Забыли пароль?"
      subtitle="Шаг 1 — запрос ссылки на почту. Введите email, мы отправим ссылку для сброса пароля."
      helperText="Ссылка действует 1 час. Если email зарегистрирован и у аккаунта есть пароль, на почту придёт письмо со ссылкой на сброс."
    >
      {sent ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-strong)]">
            Если этот email зарегистрирован, вы получите письмо со ссылкой для сброса пароля. Проверьте почту (в том числе папку «Спам») и перейдите по ссылке в течение 1 часа.
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            Не пришло письмо?{" "}
            <button
              type="button"
              className="font-semibold text-[var(--ink-strong)] underline"
              onClick={() => setSent(false)}
            >
              Отправить запрос снова
            </button>
            {" "}(не более 3 раз за 15 минут).
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="auth-field">
            <span>Email (5–255 символов)</span>
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
          {error && (
            <div className="alert alert-warn">{error}</div>
          )}
          <button
            className="auth-primary w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? "Отправка…" : "Отправить ссылку"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        Вспомнили пароль?{" "}
        <Link className="font-semibold text-[var(--ink-strong)]" href={ROUTES.login}>
          Вернуться ко входу
        </Link>
      </p>
    </AuthShell>
  );
}
