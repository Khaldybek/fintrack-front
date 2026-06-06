"use client";

import Link from "next/link";
import { useI18n } from "@/shared/i18n";
import { AppShell } from "@/widgets/app-shell";

const STEP_KEYS = [
  { title: "onboarding.stepAccounts", desc: "onboarding.stepAccountsDesc" },
  { title: "onboarding.stepBudget", desc: "onboarding.stepBudgetDesc" },
  { title: "onboarding.stepGoal", desc: "onboarding.stepGoalDesc" },
  { title: "onboarding.stepForecast", desc: "onboarding.stepForecastDesc" },
] as const;

export default function OnboardingPage() {
  const { t } = useI18n();

  return (
    <AppShell
      active="dashboard"
      title={t("onboarding.title")}
      subtitle={t("onboarding.subtitle")}
      eyebrow={t("onboarding.eyebrow")}
    >
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {STEP_KEYS.map((item, index) => (
          <article key={item.title} className="card p-5 md:p-6">
            <p className="metric-label">
              {t("onboarding.stepLabel").replace("{n}", String(index + 1))}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">
              {t(item.title)}
            </h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{t(item.desc)}</p>
            <button
              className="mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)]"
              type="button"
            >
              {t("onboarding.complete")}
            </button>
          </article>
        ))}
      </section>

      <div className="mt-5 flex justify-end">
        <Link className="action-btn" href="/">
          {t("onboarding.goDashboard")}
        </Link>
      </div>
    </AppShell>
  );
}
