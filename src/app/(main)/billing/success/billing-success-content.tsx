"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePlan } from "@/app/providers/plan-provider";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";
import { formatPlanLabel } from "@/shared/lib/plan";
import { AppShell } from "@/widgets/app-shell";

export function BillingSuccessContent() {
  const { t } = useI18n();
  const { plan, refreshPlan, isLoading } = usePlan();

  useEffect(() => {
    void refreshPlan();
  }, [refreshPlan]);

  return (
    <AppShell
      active="profile"
      title={t("billing.successTitle")}
      subtitle={t("billing.successSubtitle")}
    >
      <section className="mx-auto max-w-lg">
        <article className="card p-6 text-center">
          <p className="text-4xl">✓</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--ink-strong)]">
            {t("billing.successHeading")}
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {isLoading
              ? t("common.loading")
              : plan
                ? `${t("billing.yourPlan")}: ${formatPlanLabel(plan.plan)}`
                : t("billing.planUpdated")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link className="action-btn" href={ROUTES.home}>
              {t("billing.goToApp")}
            </Link>
            <Link className="filter-chip" href={ROUTES.profile}>
              {t("billing.backToProfile")}
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
