"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import type { ApiError } from "@/shared/api";
import {
  register as apiRegister,
  getAccessTokenFromResponse,
  getGoogleAuthUrl,
} from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import { translateFeatureGatedHint } from "@/shared/lib/translate-severity";
import { AuthShell } from "@/shared/ui";
import { TelegramOauthHint } from "./telegram-oauth-hint";

export function RegisterForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? undefined;
  const emailFromQuery = searchParams.get("email") ?? "";
  const { setSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
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
      window.location.href =
        returnTo && returnTo.startsWith("/") ? returnTo : ROUTES.home;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403 && apiErr.upgradeHint) {
        setFeatureHint(
          translateFeatureGatedHint(apiErr.featureCode, apiErr.upgradeHint, t),
        );
        setError(t("auth.register.errorRestricted"));
      } else {
        setError(apiErr.message || t("auth.register.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  }

  const googleAuthUrl = getGoogleAuthUrl();
  const loginHref = returnTo
    ? `${ROUTES.login}?returnTo=${encodeURIComponent(returnTo)}`
    : ROUTES.login;

  return (
    <AuthShell
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      helperText={t("auth.register.helper")}
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
          <span>{t("auth.register.name")}</span>
          <input
            placeholder={t("auth.register.namePlaceholder")}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>{t("auth.register.email")}</span>
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
          <span>{t("auth.register.password")}</span>
          <input
            placeholder={t("auth.register.passwordPlaceholder")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className="inline-flex items-center gap-2 pt-1 text-sm text-[var(--ink-soft)]">
          <input type="checkbox" />
          {t("auth.register.terms")}
        </label>

        <button className="auth-primary" type="submit" disabled={loading}>
          {loading ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
      </form>

      <a className="auth-google mt-3" href={googleAuthUrl}>
        <span className="mono text-xs">G</span> {t("auth.register.google")}
      </a>

      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        {t("auth.register.hasAccount")}{" "}
        <Link className="font-semibold" href={loginHref}>
          {t("auth.register.login")}
        </Link>
      </p>
    </AuthShell>
  );
}
