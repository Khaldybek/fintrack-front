"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePlan } from "@/app/providers/plan-provider";
import { ApiError, confirmBillingCheckout } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import {
  clearCheckoutSession,
  loadCheckoutSession,
} from "@/shared/lib/billing-checkout-storage";
import { formatMoneyMinor, formatPlanLabel } from "@/shared/lib/plan";
import { AppShell } from "@/widgets/app-shell";

type CheckoutPageContentProps = {
  sessionId: string;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CheckoutPageContent({ sessionId }: CheckoutPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { refreshPlan } = usePlan();
  const [session] = useState(() => loadCheckoutSession(sessionId));
  const [cardNumber, setCardNumber] = useState("4242424242424242");
  const [decline, setDecline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresAtMs = session?.expiresAt
    ? new Date(session.expiresAt).getTime()
    : 0;
  const remainingMs = expiresAtMs ? expiresAtMs - now : 0;

  useEffect(() => {
    if (expiresAtMs > 0 && remainingMs <= 0) setExpired(true);
  }, [expiresAtMs, remainingMs]);

  const amountLabel = useMemo(() => {
    if (!session) return "—";
    return (
      session.amount?.formatted ??
      formatMoneyMinor(session.amountMinor, session.currency)
    );
  }, [session]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expired) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmBillingCheckout(sessionId, {
        cardNumber: decline ? "4000000000000002" : cardNumber.replace(/\s/g, ""),
        cardBrand: "visa",
        ...(decline ? { decline: true } : {}),
      });
      await refreshPlan();
      clearCheckoutSession(sessionId);
      router.push(ROUTES.billingSuccess);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 410) {
        setExpired(true);
        setError(t("billing.sessionExpired"));
      } else if (apiErr.status === 402) {
        setError(t("billing.paymentDeclined"));
      } else {
        setError(apiErr.message ?? t("billing.paymentError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <AppShell active="profile" title={t("billing.checkoutTitle")} subtitle="">
        <div className="card p-6 space-y-4">
          <p className="text-sm text-[var(--ink-soft)]">
            {t("billing.sessionNotFound")}
          </p>
          <Link className="action-btn inline-block" href={ROUTES.pricing}>
            {t("billing.backToPricing")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="profile"
      title={t("billing.checkoutTitle")}
      subtitle={formatPlanLabel(session.planCode, t)}
    >
      <section className="mx-auto max-w-lg space-y-5">
        <article className="card p-5 md:p-6">
          <p className="metric-label">{t("billing.amountDue")}</p>
          <p className="mono mt-2 text-3xl font-semibold text-[var(--ink-strong)]">
            {amountLabel}
          </p>
          {!expired && expiresAtMs > 0 ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {t("billing.sessionTimer")}: {formatCountdown(remainingMs)}
            </p>
          ) : null}
        </article>

        {expired ? (
          <div className="alert alert-warn">
            {t("billing.sessionExpired")}{" "}
            <Link className="font-medium underline" href={ROUTES.pricing}>
              {t("billing.backToPricing")}
            </Link>
          </div>
        ) : (
          <form className="card space-y-4 p-5 md:p-6" onSubmit={handlePay}>
            <label className="auth-field">
              <span>{t("billing.cardNumber")}</span>
              <input
                inputMode="numeric"
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
              />
            </label>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("billing.mockCardHint")}
            </p>
            <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
              <input
                checked={decline}
                onChange={(e) => setDecline(e.target.checked)}
                type="checkbox"
              />
              {t("billing.simulateDecline")}
            </label>
            {error ? <div className="alert alert-warn">{error}</div> : null}
            <button
              className="action-btn w-full"
              disabled={submitting || expired}
              type="submit"
            >
              {submitting ? t("billing.paying") : t("billing.payNow")}
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
