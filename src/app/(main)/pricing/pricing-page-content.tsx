"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlan } from "@/app/providers/plan-provider";
import {
  createBillingCheckout,
  getBillingPlans,
  type BillingPlan,
} from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import { formatMoneyMinor, formatPlanLabel } from "@/shared/lib/plan";
import { saveCheckoutSession } from "@/shared/lib/billing-checkout-storage";
import { AppShell } from "@/widgets/app-shell";

function groupPlans(plans: BillingPlan[]) {
  const pro = plans.filter((p) => p.code.startsWith("pro_"));
  const family = plans.filter((p) => p.code.startsWith("family_"));
  return { pro, family };
}

export function PricingPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const { plan: currentPlan, isLoading: planLoading } = usePlan();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    getBillingPlans()
      .then((res) => setPlans(res.plans ?? []))
      .catch((err) => setError(err?.message ?? t("billing.loadPlansError")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleCheckout = async (planCode: BillingPlan["code"]) => {
    if (currentPlan?.plan === planCode) return;
    setCheckoutPlan(planCode);
    setError(null);
    try {
      const session = await createBillingCheckout({ planCode });
      saveCheckoutSession(session);
      router.push(`/checkout/${session.sessionId}`);
    } catch (err) {
      setError((err as Error)?.message ?? t("billing.checkoutError"));
    } finally {
      setCheckoutPlan(null);
    }
  };

  const { pro, family } = groupPlans(plans);

  const renderPlanCard = (item: BillingPlan) => {
    const isCurrent = currentPlan?.plan === item.code;
    const price =
      item.amountMinor != null
        ? formatMoneyMinor(item.amountMinor, item.currency)
        : "—";
    const interval =
      item.intervalDays === 365
        ? t("billing.perYear")
        : t("billing.perMonth");

    return (
      <article key={item.code} className="card flex flex-col p-5 md:p-6">
        <p className="metric-label">{item.name}</p>
        <p className="mono mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
          {price}
          <span className="ml-1 text-sm font-normal text-[var(--ink-muted)]">
            {interval}
          </span>
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
          {item.description}
        </p>
        <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--ink-soft)]">
          <li>
            {t("billing.featureIndex")}:{" "}
            {item.features.dashboardIndex ? t("common.yes") : t("common.no")}
          </li>
          <li>
            {t("billing.featureFamily")}:{" "}
            {item.features.familyMode ? t("common.yes") : t("common.no")}
          </li>
        </ul>
        <button
          className="action-btn mt-5 w-full"
          disabled={isCurrent || checkoutPlan === item.code}
          onClick={() => void handleCheckout(item.code)}
          type="button"
        >
          {isCurrent
            ? t("billing.currentPlan")
            : checkoutPlan === item.code
              ? t("billing.checkoutStarting")
              : t("billing.subscribe")}
        </button>
      </article>
    );
  };

  return (
    <AppShell
      active="profile"
      title={t("billing.pricingTitle")}
      subtitle={t("billing.pricingSubtitle")}
    >
      <section className="space-y-6">
        {currentPlan && !planLoading ? (
          <div className="alert alert-info">
            {t("billing.yourPlan")}: {formatPlanLabel(currentPlan.plan, t)}
          </div>
        ) : null}
        {error ? <div className="alert alert-warn">{error}</div> : null}
        {loading ? (
          <div className="card p-6">{t("common.loading")}</div>
        ) : (
          <>
            {pro.length > 0 ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-[var(--ink-strong)]">
                  {t("billing.groupPro")}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {pro.map(renderPlanCard)}
                </div>
              </div>
            ) : null}
            {family.length > 0 ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-[var(--ink-strong)]">
                  {t("billing.groupFamily")}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {family.map(renderPlanCard)}
                </div>
              </div>
            ) : null}
          </>
        )}
        <p className="text-center text-sm text-[var(--ink-muted)]">
          <a className="underline" href={ROUTES.profile}>
            {t("billing.backToProfile")}
          </a>
        </p>
      </section>
    </AppShell>
  );
}
