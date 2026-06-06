"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { usePlan } from "@/app/providers/plan-provider";
import { FeatureGatedError } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { formatMoney } from "@/shared/lib";
import { formatNumberLocale } from "@/shared/lib/format-locale";
import { useI18n } from "@/shared/i18n";
import { isFeatureGatedError } from "@/shared/lib/is-feature-gated";
import { translateSeverityLabel } from "@/shared/lib/translate-severity";
import { ActionInfoModal } from "@/shared/ui";
import { AddTransactionModal } from "@/features/add-transaction";
import { AppShell } from "@/widgets/app-shell";
import {
  getDashboardSummary,
  getDashboardForecast,
  getDashboardAlerts,
  getDashboardInsight,
  getDashboardIndex,
  getSalarySchedules,
  createSalarySchedule,
  deleteSalarySchedule,
  getDashboardCharts,
} from "@/shared/api";
import type {
  DashboardSummary,
  DashboardForecast,
  DashboardAlert,
  DashboardInsight,
  DashboardIndex,
  SalarySchedule,
  DashboardCashflowByMonth,
  DashboardExpenseByDay,
} from "@/shared/api";


const SEVERITY_ICON: Record<string, string> = {
  risk: "🔴",
  attention: "⛅",
  good: "🟢",
};

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function severityTextClass(sev: string | undefined): string {
  if (sev === "risk") return "text-[#9f1239]";
  if (sev === "attention") return "text-[#92400e]";
  return "text-[var(--ink-soft)]";
}

/** Столбцы графика расходов по дням (GET /dashboard/charts → expense_by_day). */
function buildDailyBarsFromExpenseByDay(days: DashboardExpenseByDay[]): { id: string; h: number; label: string }[] {
  if (!days?.length) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const amounts = sorted.map((d) => Math.abs(d.amount_minor));
  const max = Math.max(...amounts, 1);
  return sorted.map((d, i) => ({
    id: `d${i + 1}`,
    label: d.date.length >= 10 ? d.date.slice(8, 10) : String(i + 1),
    h: Math.round((Math.abs(d.amount_minor) / max) * 100) || 8,
  }));
}

const INDEX_STATUS_KEYS: Record<string, string> = {
  stable: "dashboard.indexStatus.stable",
  attention: "dashboard.indexStatus.attention",
  risk: "dashboard.indexStatus.risk",
};

function formatCashflowMonthLabel(
  ym: string,
  t: (path: string) => string,
): string {
  const p = ym.split("-");
  if (p.length >= 2) {
    const monthKey = p[1]?.padStart(2, "0") ?? "";
    const m = t(`months.${monthKey}`);
    if (m !== `months.${monthKey}` && p[0]) return `${m} ${p[0].slice(2)}`;
  }
  return ym;
}

export function DashboardPageContent() {
  const { t, locale } = useI18n();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { plan } = usePlan();
  const dashboardIndexEnabled = plan?.features?.dashboardIndex ?? false;
  const [indexGated, setIndexGated] = useState(false);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<DashboardForecast | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [index, setIndex] = useState<DashboardIndex | null>(null);
  const [salarySchedules, setSalarySchedules] = useState<SalarySchedule[]>([]);
  const [spendingBars, setSpendingBars] = useState<
    { categoryId: string; label: string; value: number; color?: string }[]
  >([]);
  const [dailyChart, setDailyChart] = useState<{ id: string; h: number; label: string }[]>([]);
  const [cashflowByMonth, setCashflowByMonth] = useState<DashboardCashflowByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Форма создания salary schedule
  const [salaryDay, setSalaryDay] = useState("");
  const [salaryLabel, setSalaryLabel] = useState("");
  /** Сумма зарплаты, ₸ (целые единицы → amountMinor в API) */
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);

  const loadDashboard = () => {
    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);
    const from7 = new Date(now);
    from7.setDate(from7.getDate() - 7);
    const dateFromWeek = from7.toISOString().slice(0, 10);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateFromMonth = monthStart.toISOString().slice(0, 10);

    const indexPromise = dashboardIndexEnabled
      ? getDashboardIndex().catch((err) => {
          if (err instanceof FeatureGatedError || isFeatureGatedError(err)) {
            setIndexGated(true);
          }
          return null;
        })
      : Promise.resolve(null);

    Promise.all([
      getDashboardSummary(),
      getDashboardForecast(),
      getDashboardAlerts(),
      getDashboardInsight(),
      indexPromise,
      getSalarySchedules().catch(() => []),
      getDashboardCharts({ dateFrom: dateFromWeek, dateTo, months: 6 }).catch(() => null),
      getDashboardCharts({ dateFrom: dateFromMonth, dateTo, months: 6 }).catch(() => null),
    ])
      .then(([summaryRes, forecastRes, alertsRes, insightRes, indexRes, schedulesRes, chartsWeek, chartsMonth]) => {
        setSummary(summaryRes);
        setForecast(forecastRes);
        setAlerts(alertsRes.items ?? []);
        setInsight(insightRes);
        setIndex(indexRes ?? null);
        setSalarySchedules(Array.isArray(schedulesRes) ? schedulesRes : []);

        // GET /dashboard/charts — расходы по дням (неделя)
        setDailyChart(buildDailyBarsFromExpenseByDay(chartsWeek?.expense_by_day ?? []));

        // Структура расходов по категориям (текущий месяц)
        const bars = (chartsMonth?.expense_by_category ?? [])
          .filter((c) => c.amount_minor > 0)
          .slice(0, 5)
          .map((c) => ({
            categoryId: c.categoryId,
            label: c.name,
            value: Math.min(100, Math.max(0, Math.round(c.share_pct))),
            color: c.color,
          }));
        setSpendingBars(bars);

        setCashflowByMonth(chartsMonth?.cashflow_by_month ?? []);
      })
      .catch((err) => setError(err?.message ?? t("dashboard.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, dashboardIndexEnabled]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryError(null);
    const day = parseInt(salaryDay, 10);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setSalaryError(t("dashboard.salaryDayError"));
      return;
    }
    const amountDigits = salaryAmount.replace(/\s/g, "");
    const amountParsed = amountDigits ? parseInt(amountDigits, 10) : NaN;
    if (amountDigits && (!Number.isFinite(amountParsed) || amountParsed < 1)) {
      setSalaryError(t("dashboard.salaryAmountError"));
      return;
    }

    setSalarySubmitting(true);
    try {
      await createSalarySchedule({
        dayOfMonth: day,
        label: salaryLabel.trim() || undefined,
        ...(Number.isFinite(amountParsed) && amountParsed >= 1
          ? { amountMinor: amountParsed }
          : {}),
      });
      const updated = await getSalarySchedules();
      setSalarySchedules(Array.isArray(updated) ? updated : []);
      setSalaryDay("");
      setSalaryLabel("");
      setSalaryAmount("");
      setSalaryModalOpen(false);
    } catch (err) {
      setSalaryError((err as Error)?.message ?? t("dashboard.salaryCreateError"));
    } finally {
      setSalarySubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSalarySchedule(id);
      setSalarySchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <AppShell active="dashboard" title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} eyebrow={t("dashboard.eyebrow")}>
        <section className="grid grid-cols-1 gap-5">
          <div className="metric-label">{t("common.loading")}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="dashboard" title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} eyebrow={t("dashboard.eyebrow")}>
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  const balanceStr = formatMoney(summary?.balance) || (summary ? `${formatNumberLocale(summary.balance_total_minor, locale)} ${summary.currency}` : "—");
  const incomeStr = formatMoney(summary?.income) || (summary ? `${formatNumberLocale(summary.income_minor, locale)} ₸` : "—");
  const expenseStr = formatMoney(summary?.expense) || (summary ? `${formatNumberLocale(summary.expense_minor, locale)} ₸` : "—");
  const netMinor = (summary?.income_minor ?? 0) - (summary?.expense_minor ?? 0);
  const netStr = summary ? `${formatNumberLocale(netMinor, locale)} ${summary.currency}` : "—";
  const projectedStr = formatMoney(forecast?.projected_balance) || (forecast ? `${formatNumberLocale(forecast.projected_balance_minor, locale)} ${summary?.currency ?? ""}` : "—");

  const indexFactors = [
    ...(index?.factors_positive ?? []).map((f) => ({ label: f.label, score: `+${f.score}`, tone: "up" as const })),
    ...(index?.factors_negative ?? []).map((f) => ({ label: f.label, score: String(-Math.abs(f.score)), tone: "down" as const })),
  ].slice(0, 4);

  return (
    <>
      <AppShell
        active="dashboard"
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitleFull")}
        eyebrow={t("dashboard.eyebrow")}
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">

            {/* Метрики верхнего уровня */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {insight != null && (
                <article className="card metric-card loading-reveal stagger-1">
                  <p className="metric-label">{t("dashboard.weather")}</p>
                  <p className="mt-2 text-lg font-semibold text-[#92400e]">
                    {SEVERITY_ICON[insight.severity] ?? "💡"}{" "}
                    {translateSeverityLabel(insight.status, insight.severity, t)}
                  </p>
                  <p className="metric-hint">{insight.text}</p>
                </article>
              )}

              <article className="card metric-card loading-reveal stagger-2">
                <p className="metric-label">{t("dashboard.balance")}</p>
                <p className="mono metric-value">{balanceStr}</p>
                <p className={`metric-hint ${forecast?.severity === "attention" || forecast?.severity === "risk" ? "warn" : "up"}`}>
                  {forecast != null
                    ? `${t("dashboard.forecastUntilMonth").replace("{days}", String(forecast.days_left))} ${forecast.severity === "good" ? t("dashboard.forecastGood") : `· ${forecast.explanation}`}`
                    : "—"}
                </p>
                {forecast?.explanationAi && (
                  <p className="mt-1.5 text-xs text-[var(--ink-muted)]">{forecast.explanationAi}</p>
                )}
              </article>

              <article className="card metric-card loading-reveal stagger-3">
                <p className="metric-label">{t("dashboard.incomeExpenseMonth")}</p>
                <p className="mono metric-value">{incomeStr} / {expenseStr}</p>
                <p className="metric-hint">{t("dashboard.remainder").replace("{amount}", netStr)}</p>
              </article>

              {!dashboardIndexEnabled || indexGated ? (
                <article className="card metric-card loading-reveal stagger-4 xl:col-span-2">
                  <p className="metric-label">{t("dashboard.indexScore")}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                    {t("dashboard.indexGated")}
                  </p>
                  <Link className="action-btn mt-4 inline-block" href={ROUTES.pricing}>
                    {t("upgrade.viewPlans")}
                  </Link>
                </article>
              ) : index != null ? (
                <article className="card metric-card loading-reveal stagger-4 xl:col-span-2">
                  <p className="metric-label">{t("dashboard.indexScore")}</p>
                  <div className="mt-2 flex items-end gap-3">
                    <p className="mono metric-value text-[2.1rem] leading-none">{index.score}</p>
                    <span className="index-badge">{t(INDEX_STATUS_KEYS[index.status] ?? index.status)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {indexFactors.map((factor) => (
                      <div key={factor.label} className="metric-row">
                        <span>{factor.label}</span>
                        <span className={`mono ${factor.tone === "up" ? "text-[#166534]" : "text-[#9f1239]"}`}>
                          {factor.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              <article className="card metric-card loading-reveal">
                <p className="metric-label">{t("dashboard.forecastEndMonth")}</p>
                <p className="mono metric-value">{projectedStr}</p>
                {forecast && (
                  <>
                    <p className={`metric-hint ${severityTextClass(forecast.severity)}`}>
                      {forecast.explanation}
                    </p>
                    {forecast.explanationAi && (
                      <p className="mt-1.5 text-xs text-[var(--ink-muted)]">{forecast.explanationAi}</p>
                    )}
                  </>
                )}
              </article>
            </div>

            {/* График расходов + алерты */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
              <article className="card loading-reveal p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.expenseChart")}</h2>
                  <span className="mono text-xs text-[var(--ink-muted)]">{t("dashboard.last8Days")}</span>
                </div>
                {dailyChart.length > 0 ? (
                  <div
                    className="grid h-40 items-end gap-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(dailyChart.length, 14)}, minmax(0, 1fr))` }}
                  >
                    {dailyChart.map((bar) => (
                      <div key={bar.id} className="space-y-2">
                        <div
                          className="rounded-md bg-gradient-to-t from-[#0f172a] to-[#64748b]"
                          style={{ height: `${bar.h}%` }}
                        />
                        <p className="mono text-center text-[10px] text-[var(--ink-muted)]">{bar.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">{t("dashboard.noExpenseData")}</p>
                )}
              </article>

              {cashflowByMonth.length > 0 && (
                <article className="card loading-reveal p-5 md:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.monthlyChart")}</h2>
                    <span className="mono text-xs text-[var(--ink-muted)]">{t("dashboard.cashflowTrend")}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--line)] text-left text-[var(--ink-muted)]">
                          <th className="pb-2 pr-3 font-medium">{t("analytics.month")}</th>
                          <th className="pb-2 pr-3 font-medium">{t("analytics.incomeCol")}</th>
                          <th className="pb-2 pr-3 font-medium">{t("analytics.expenseCol")}</th>
                          <th className="pb-2 font-medium">{t("dashboard.netCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashflowByMonth.map((m) => (
                          <tr key={m.month} className="border-b border-[var(--line)]/60">
                            <td className="py-2.5 pr-3 font-medium text-[var(--ink-strong)]">
                              {formatCashflowMonthLabel(m.month, t)}
                            </td>
                            <td className="mono py-2.5 pr-3 text-[#166534]">
                              {formatMoney(m.income)}
                            </td>
                            <td className="mono py-2.5 pr-3 text-[#9f1239]">
                              {formatMoney(m.expense)}
                            </td>
                            <td className={`mono py-2.5 ${m.net_minor >= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}>
                              {formatMoney(m.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              <article className="card loading-reveal p-5 md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.alerts")}</h2>
                <div className="mt-4 space-y-3">
                  {alerts.length > 0 ? (
                    alerts.slice(0, 3).map((a, i) => (
                      <div
                        key={`${a.type}-${i}`}
                        className={a.severity === "risk" || a.severity === "attention" ? "alert alert-warn" : "alert"}
                      >
                        {a.amount != null && (
                          <span className="mono text-xs text-[var(--ink-muted)]">{formatMoney(a.amount)} </span>
                        )}
                        {a.explanation}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--ink-muted)]">{t("dashboard.noAlerts")}</p>
                  )}
                </div>
                <div className="mt-5">
                  <ActionInfoModal
                    confirmLabel={t("dashboard.applyScenario")}
                    description={t("dashboard.riskScenariosDesc")}
                    items={[
                      t("dashboard.riskScenario1"),
                      t("dashboard.riskScenario2"),
                      t("dashboard.riskScenario3"),
                    ]}
                    title={t("dashboard.riskScenarios")}
                    triggerClassName="w-full rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-strong)] transition hover:bg-[var(--surface-2)]"
                    triggerLabel={t("dashboard.openRiskScenarios")}
                  />
                </div>
              </article>
            </div>

            {/* Инсайт дня */}
            {insight != null && (
              <article className="card loading-reveal p-5 md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.dailyInsight")}</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="alert">{insight.text}</div>
                  {insight.status && (
                    <div className={`alert ${insight.severity === "attention" || insight.severity === "risk" ? "alert-warn" : ""}`}>
                      {t("dashboard.statusLabel").replace(
                        "{status}",
                        translateSeverityLabel(insight.status, insight.severity, t),
                      )}
                      {insight.severity === "attention" ? t("dashboard.watchSpending") : ""}
                    </div>
                  )}
                </div>
              </article>
            )}

            {/* Расписание зарплат */}
            <article className="card loading-reveal p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.salarySchedule")}</h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    {t("dashboard.salaryHint")}
                  </p>
                </div>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => { setSalaryModalOpen(true); setSalaryError(null); }}
                >
                  {t("dashboard.addButton")}
                </button>
              </div>

              {salarySchedules.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  {t("dashboard.noSchedules")}
                </p>
              ) : (
                <div className="space-y-2">
                  {salarySchedules.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-2.5">
                      <div className="min-w-0">
                        <span className="mono font-semibold text-[var(--ink-strong)]">{t("dashboard.dayOfMonthDisplay").replace("{day}", String(s.dayOfMonth))}</span>
                        {s.label && (
                          <span className="ml-2 text-sm text-[var(--ink-muted)]">— {s.label}</span>
                        )}
                        {s.amountMinor != null && s.amountMinor > 0 && (
                          <p className="mono mt-0.5 text-sm font-medium text-[#166534]">
                            {formatNumberLocale(s.amountMinor, locale)} ₸
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="tx-inline-btn danger h-8 rounded-lg px-3 text-xs"
                        onClick={() => handleDeleteSchedule(s.id)}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          {/* Сайдбар */}
          <aside className="hidden flex-col gap-5 xl:flex">
            {spendingBars.length > 0 && (
              <article className="card loading-reveal p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">{t("dashboard.spendingStructure")}</h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{t("dashboard.currentMonth")}</p>
                <div className="mt-4 space-y-4">
                  {spendingBars.map((item) => (
                    <div key={item.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--ink-soft)]">{item.label}</span>
                        <span className="mono text-[var(--ink-strong)]">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155]"
                          style={{
                            width: `${item.value}%`,
                            ...(item.color
                              ? {
                                  background: item.color,
                                  backgroundImage: "none",
                                }
                              : {}),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* Резюме прогноза в сайдбаре */}
            {forecast != null && (
              <article className="card loading-reveal p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">{t("dashboard.forecast")}</h2>
                <div className="mt-3 space-y-2">
                  <div className="metric-row">
                    <span>{t("dashboard.balanceNow")}</span>
                    <span className="mono">{formatMoney(forecast.balance) || balanceStr}</span>
                  </div>
                  <div className="metric-row">
                    <span>{t("dashboard.endOfMonth")}</span>
                    <span className={`mono ${severityTextClass(forecast.severity)}`}>{projectedStr}</span>
                  </div>
                  <div className="metric-row">
                    <span>{t("dashboard.daysLeft")}</span>
                    <span className="mono">{forecast.days_left}</span>
                  </div>
                </div>
                {forecast.explanation && (
                  <p className={`mt-3 text-xs ${severityTextClass(forecast.severity)}`}>{forecast.explanation}</p>
                )}
                {forecast.explanationAi && (
                  <p className="mt-1.5 text-xs text-[var(--ink-muted)]">{forecast.explanationAi}</p>
                )}
              </article>
            )}
          </aside>
        </section>

        <AddTransactionModal />
      </AppShell>

      {/* Модал добавления расписания зарплат */}
      {salaryModalOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setSalaryModalOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{t("dashboard.addSchedule")}</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setSalaryModalOpen(false)}>{t("common.close")}</button>
            </div>
            <form onSubmit={handleCreateSchedule} className="grid gap-3">
              {salaryError && <div className="alert alert-warn">{salaryError}</div>}
              <label className="auth-field">
                <span>{t("dashboard.dayOfMonth")} <span className="text-[#9f1239]">*</span></span>
                <input
                  value={salaryDay}
                  onChange={(e) => setSalaryDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="15"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="auth-field">
                <span>{t("dashboard.labelOptional")}</span>
                <input
                  value={salaryLabel}
                  onChange={(e) => setSalaryLabel(e.target.value)}
                  placeholder={t("dashboard.mainSalary")}
                  maxLength={100}
                  autoComplete="off"
                />
              </label>
              <label className="auth-field">
                <span>{t("dashboard.amountOptional")}</span>
                <input
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(formatAmountInput(e.target.value))}
                  placeholder="850 000"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                {t("dashboard.amountHint")}
              </p>
              <div className="mt-1 flex gap-2">
                <button className="action-btn flex-1" type="submit" disabled={salarySubmitting}>
                  {salarySubmitting ? t("common.saving") : t("dashboard.addButton")}
                </button>
                <button className="tx-inline-btn" type="button" onClick={() => setSalaryModalOpen(false)}>{t("common.cancel")}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
