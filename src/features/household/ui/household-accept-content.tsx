"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import {
  acceptHouseholdInvite,
  getHouseholdInvitePreview,
} from "@/shared/api";
import type { HouseholdInvitePreview } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import { roleLabel } from "@/features/household/lib/format";
import { AuthShell } from "@/shared/ui";

export function HouseholdAcceptContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [preview, setPreview] = useState<HouseholdInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const returnTo = token
    ? `${ROUTES.householdAccept}?token=${encodeURIComponent(token)}`
    : ROUTES.householdAccept;

  const loginHref = `${ROUTES.login}?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `${ROUTES.register}?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(preview?.email ?? "")}`;

  useEffect(() => {
    if (!token) {
      setError(t("family.accept.noToken"));
      setLoading(false);
      return;
    }
    getHouseholdInvitePreview(token)
      .then(setPreview)
      .catch(() => setError(t("family.accept.invalidToken")))
      .finally(() => setLoading(false));
  }, [token, t]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptHouseholdInvite({ token });
      setAccepted(true);
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (
        preview?.email &&
        user?.email &&
        user.email.toLowerCase() !== preview.email.toLowerCase()
      ) {
        setError(
          t("family.accept.emailMismatch").replace("{email}", preview.email),
        );
      } else {
        setError(msg || t("family.accept.invalidToken"));
      }
    } finally {
      setAccepting(false);
    }
  }, [token, preview?.email, user?.email, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && preview && !accepted && !accepting && !error) {
      if (
        user?.email &&
        preview.email &&
        user.email.toLowerCase() !== preview.email.toLowerCase()
      ) {
        setError(
          t("family.accept.emailMismatch").replace("{email}", preview.email),
        );
      }
    }
  }, [authLoading, isAuthenticated, preview, accepted, accepting, error, user?.email, t]);

  if (loading || authLoading) {
    return (
      <AuthShell
        helperText=""
        title={t("family.accept.title")}
        subtitle={t("common.loading")}
      >
        <p className="text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
      </AuthShell>
    );
  }

  if (!token || (error && !preview)) {
    return (
      <AuthShell helperText="" title={t("family.accept.title")} subtitle="">
        <div className="alert alert-warn">{error ?? t("family.accept.invalidToken")}</div>
        <Link className="auth-primary mt-4 inline-block text-center" href={ROUTES.login}>
          {t("family.accept.login")}
        </Link>
      </AuthShell>
    );
  }

  if (accepted) {
    return (
      <AuthShell
        helperText=""
        title={t("family.accept.success")}
        subtitle={preview?.householdName ?? ""}
      >
        <button
          className="auth-primary w-full"
          type="button"
          onClick={() => router.push(ROUTES.family)}
        >
          {t("family.accept.goToFamily")}
        </button>
      </AuthShell>
    );
  }

  const expiresLabel = preview?.expiresAt
    ? new Date(preview.expiresAt).toLocaleDateString("ru-KZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <AuthShell
      helperText=""
      title={t("family.accept.title")}
      subtitle={t("family.accept.subtitle").replace(
        "{name}",
        preview?.householdName ?? "—",
      )}
    >
      <div className="space-y-3 text-sm text-[var(--ink-soft)]">
        <p>{t("family.accept.invitedAs").replace("{email}", preview?.email ?? "—")}</p>
        <p>
          {t("family.accept.role").replace(
            "{role}",
            preview ? roleLabel(preview.role, t) : "—",
          )}
        </p>
        <p>{t("family.accept.expires").replace("{date}", expiresLabel)}</p>
      </div>

      {error ? <div className="alert alert-warn mt-4">{error}</div> : null}

      {isAuthenticated ? (
        <button
          className="auth-primary mt-6 w-full"
          disabled={accepting || Boolean(error)}
          onClick={() => void handleAccept()}
          type="button"
        >
          {accepting ? t("family.accept.accepting") : t("family.accept.accept")}
        </button>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm text-[var(--ink-muted)]">
            {t("family.accept.loginHint").replace("{email}", preview?.email ?? "")}
          </p>
          <Link className="auth-primary text-center" href={loginHref}>
            {t("family.accept.login")}
          </Link>
          <Link className="auth-google text-center" href={registerHref}>
            {t("family.accept.register")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
