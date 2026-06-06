"use client";

import { useEffect, useState } from "react";
import {
  getDashboardForecast,
  getDashboardAlerts,
  getDashboardInsight,
} from "@/shared/api";
import type {
  DashboardForecast,
  DashboardAlert,
  DashboardInsight,
} from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatMoney as moneyDisplay } from "@/shared/lib";
import { formatDateLocale } from "@/shared/lib/format-locale";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";

export function CashflowPageContent() {
  const { t, locale } = useI18n();
  const [forecast, setForecast] = useState<DashboardForecast | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateShort = (iso: string) =>
    formatDateLocale(iso, locale, { day: "numeric", month: "short" });

  const severityLabel = (severity: string | undefined) => {
    if (severity === "risk") return t("cashflow.riskLabel");
    if (severity === "attention") return t("cashflow.attentionLabel");
    if (severity === "good") return t("cashflow.stableLabel");
    return t("cashflow.normalLabel");
  };

  useEffect(() => {
    Promise.all([
      getDashboardForecast(),
      getDashboardAlerts(),
      getDashboardInsight(),
    ])
      .then(([f, a, i]) => {
        setForecast(f);
        setAlerts(a?.items ?? []);
        setInsight(i ?? null);
      })
      .catch((err) => setError(err?.message ?? t("cashflow.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <AppShell
        active="dashboard"
        title={t("cashflow.title")}
        subtitle={t("cashflow.subtitle")}
        actionLabel={t("cashflow.configureScenario")}
      >
        <ExtraScreensNav active="cashflow" compact />
        <section className="grid grid-cols-1 gap-5">
          <div className="metric-label">{t("common.loading")}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        active="dashboard"
        title={t("cashflow.title")}
        subtitle={t("cashflow.subtitle")}
        actionLabel={t("cashflow.configureScenario")}
      >
        <ExtraScreensNav active="cashflow" compact />
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  const riskLabel = severityLabel(forecast?.severity);
  const riskPercent = null;

  const singleRow = forecast
    ? {
        day: formatDateShort(forecast.date_to),
        balance: moneyDisplay(
          forecast.projected_balance ??
            (forecast.projected_balance_minor != null
              ? { amount_minor: forecast.projected_balance_minor, currency: "₸" }
              : null),
        ),
        risk: forecast.severity as "normal" | "warn" | "good" | "risk",
      }
    : null;

  return (
    <AppShell
      active="dashboard"
      title={t("cashflow.title")}
      subtitle={t("cashflow.subtitle")}
      actionLabel={t("cashflow.configureScenario")}
    >
      <ExtraScreensNav active="cashflow" compact />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <article className="card p-5 md:p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="metric-card rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <p className="metric-label">{t("cashflow.risk")}</p>
              <p
                className={`mono mt-2 text-2xl font-semibold ${forecast?.severity === "risk" ? "text-[#92400e]" : forecast?.severity === "attention" ? "text-[#b45309]" : "text-[var(--ink-strong)]"}`}
              >
                {riskPercent != null ? `${riskPercent}%` : riskLabel}
              </p>
            </div>
            <div className="metric-card rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <p className="metric-label">{t("cashflow.minimum")}</p>
              <p className="mono mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                {moneyDisplay(forecast?.balance)}
              </p>
            </div>
            <div className="metric-card rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
              <p className="metric-label">{t("cashflow.forecastEom")}</p>
              <p className="mono mt-2 text-2xl font-semibold text-[#166534]">
                {moneyDisplay(
                  forecast?.projected_balance ??
                    (forecast?.projected_balance_minor != null
                      ? {
                          amount_minor: forecast.projected_balance_minor,
                          currency: "₸",
                        }
                      : null),
                )}
              </p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            {t("cashflow.daily")}
          </h2>
          <div className="mt-4 space-y-2">
            {singleRow ? (
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
                <p className="mono text-xs text-[var(--ink-muted)]">{singleRow.day}</p>
                <p className="mono text-sm font-medium text-[var(--ink-strong)]">
                  {singleRow.balance}
                </p>
                <p className="mono text-xs text-[var(--ink-muted)]">
                  {t("cashflow.untilMonthEnd")}
                </p>
                <span
                  className={`budget-pill ${singleRow.risk === "risk" ? "risk" : singleRow.risk === "good" ? "normal" : "neutral"}`}
                >
                  {severityLabel(singleRow.risk)}
                </span>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="flex flex-col gap-5">
          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              {t("cashflow.triggers")}
            </h2>
            <div className="mt-4 space-y-3">
              {alerts.length > 0 ? (
                alerts.map((a, i) => (
                  <div
                    key={i}
                    className={
                      a.severity === "risk" || a.severity === "attention"
                        ? "alert alert-warn"
                        : "alert"
                    }
                  >
                    {a.amount != null && (
                      <span className="mono text-xs text-[var(--ink-muted)]">
                        {moneyDisplay(a.amount)}{" "}
                      </span>
                    )}
                    {a.explanation}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">{t("cashflow.noTriggers")}</p>
              )}
            </div>
          </article>

          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              {t("cashflow.recommendation")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              {forecast?.explanation || insight?.text}
            </p>
            {forecast?.explanationAi && (
              <p className="mt-2 text-xs text-[var(--ink-muted)]">{forecast.explanationAi}</p>
            )}
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
