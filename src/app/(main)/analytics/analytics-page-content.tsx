"use client";

import { Package } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccountsNav } from "@/app/(main)/accounts-nav-context";
import { usePlan } from "@/app/providers/plan-provider";
import type {
  AnalyticsAnomalyItem,
  AnalyticsCategoryItem,
  AnalyticsCompareResponse,
  AnalyticsHeatmapDay,
  AnalyticsMonthlyResponse,
  AnalyticsSavingsRateItem,
  AnalyticsTopCategoryItem,
  AnalyticsTrendItem,
  DashboardIndex,
  DashboardSummary,
} from "@/shared/api";
import {
  exportMonthlyReport,
  getAnalyticsAnomalies,
  getAnalyticsCategories,
  getAnalyticsCompare,
  getAnalyticsHeatmap,
  getAnalyticsMonthly,
  getAnalyticsSavingsRate,
  getAnalyticsTopCategories,
  getAnalyticsTrends,
  getDashboardIndex,
  getDashboardSummary,
  getMonthlyReportSummary,
} from "@/shared/api";
import { ROUTES } from "@/shared/config";
import type { Locale } from "@/shared/i18n";
import { useI18n } from "@/shared/i18n";
import {
  downloadOrShareBlob,
  formatMoney,
  openIosBlobPreviewWindow,
} from "@/shared/lib";
import { formatDateLocale, formatNumberLocale } from "@/shared/lib/format-locale";
import { ActionInfoModal } from "@/shared/ui";
import { AppShell } from "@/widgets/app-shell";

const DEFAULT_COLORS = [
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
];

function getMonthLabel(ym: string, locale: Locale): string {
  const parts = ym.split("-");
  if (parts.length !== 2) return ym;
  return formatDateLocale(`${ym}-01`, locale, { month: "short" });
}

function toMinor(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "amount_minor" in value)
    return (value as { amount_minor: number }).amount_minor;
  return 0;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

function statusBadge(
  status: string,
  t: (path: string) => string,
): { label: string; cls: string } {
  if (status === "good")
    return { label: t("analytics.statusGood"), cls: "bg-green-100 text-green-800" };
  if (status === "attention")
    return { label: t("analytics.statusAttention"), cls: "bg-yellow-100 text-yellow-800" };
  if (status === "risk")
    return { label: t("analytics.statusRisk"), cls: "bg-red-100 text-red-800" };
  return { label: status, cls: "bg-gray-100 text-gray-700" };
}

export function AnalyticsPageContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { hasAccounts } = useAccountsNav();
  const { plan } = usePlan();
  const dashboardIndexEnabled = plan?.features?.dashboardIndex ?? false;

  useEffect(() => {
    if (hasAccounts === false) router.replace(ROUTES.home);
  }, [hasAccounts, router]);

  const now = new Date();
  const currentYear = now.getFullYear();

  const firstDayOfMonth = toLocalDateString(
    new Date(currentYear, now.getMonth(), 1),
  );
  const lastDayOfMonth = toLocalDateString(
    new Date(currentYear, now.getMonth() + 1, 0),
  );

  // Previous month for compare
  const prevMonthStart = toLocalDateString(
    new Date(currentYear, now.getMonth() - 1, 1),
  );
  const prevMonthEnd = toLocalDateString(
    new Date(currentYear, now.getMonth(), 0),
  );

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [categories, setCategories] = useState<AnalyticsCategoryItem[]>([]);
  const [totalExpenseStr, setTotalExpenseStr] = useState("");
  const [totalExpenseMinor, setTotalExpenseMinor] = useState(0);
  const [monthly, setMonthly] = useState<AnalyticsMonthlyResponse | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendItem[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<AnalyticsHeatmapDay[]>([]);
  const [heatmapExplanation, setHeatmapExplanation] = useState("");
  const [anomalies, setAnomalies] = useState<AnalyticsAnomalyItem[]>([]);
  const [anomaliesStatus, setAnomaliesStatus] = useState("");
  const [topCategories, setTopCategories] = useState<
    AnalyticsTopCategoryItem[]
  >([]);
  const [savingsRate, setSavingsRate] = useState<AnalyticsSavingsRateItem[]>(
    [],
  );
  const [compare, setCompare] = useState<AnalyticsCompareResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [index, setIndex] = useState<DashboardIndex | null>(null);
  const [reportSummary, setReportSummary] = useState<{
    summaryText: string;
    shareReadyText: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getAnalyticsCategories({
        dateFrom: firstDayOfMonth,
        dateTo: lastDayOfMonth,
      }),
      getAnalyticsMonthly(selectedYear),
      getAnalyticsTrends(6),
      getAnalyticsHeatmap(90).catch(() => ({ days: [], explanation: "" })),
      getAnalyticsAnomalies().catch(() => ({ items: [], status: "" })),
      getAnalyticsTopCategories({
        dateFrom: firstDayOfMonth,
        dateTo: lastDayOfMonth,
        limit: 5,
      }).catch(() => ({
        date_from: "",
        date_to: "",
        items: [],
        total_expense: "",
      })),
      getAnalyticsSavingsRate(6).catch(() => ({ items: [] })),
      getAnalyticsCompare({
        aFrom: prevMonthStart,
        aTo: prevMonthEnd,
        bFrom: firstDayOfMonth,
        bTo: lastDayOfMonth,
      }).catch(() => null),
      getDashboardSummary().catch(() => null),
      dashboardIndexEnabled
        ? getDashboardIndex().catch(() => null)
        : Promise.resolve(null),
      getMonthlyReportSummary().catch(() => null),
    ])
      .then(
        ([
          catRes,
          monthlyRes,
          trendsRes,
          heatmapRes,
          anomaliesRes,
          topCatRes,
          savingsRes,
          compareRes,
          summaryRes,
          indexRes,
          reportSummaryRes,
        ]) => {
          setCategories(Array.isArray(catRes?.items) ? catRes.items : []);
          setTotalExpenseMinor(
            typeof catRes?.total_expense_minor === "number"
              ? catRes.total_expense_minor
              : 0,
          );
          setTotalExpenseStr(formatMoney(catRes?.total_expense ?? null));
          setMonthly(
            monthlyRes && typeof monthlyRes === "object"
              ? monthlyRes
              : { year: selectedYear, months: [] },
          );
          setTrends(Array.isArray(trendsRes?.items) ? trendsRes.items : []);
          setHeatmapDays(Array.isArray(heatmapRes.days) ? heatmapRes.days : []);
          setHeatmapExplanation(heatmapRes.explanation ?? "");
          setAnomalies(
            Array.isArray(anomaliesRes.items) ? anomaliesRes.items : [],
          );
          setAnomaliesStatus(anomaliesRes.status ?? "");
          setTopCategories(topCatRes.items ?? []);
          setSavingsRate(savingsRes.items ?? []);
          setCompare(compareRes ?? null);
          setSummary(summaryRes ?? null);
          setIndex(indexRes ?? null);
          setReportSummary(reportSummaryRes ?? null);
        },
      )
      .catch((err) =>
        setError(err?.message ?? t("analytics.loadError")),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, dashboardIndexEnabled, t, firstDayOfMonth, lastDayOfMonth, prevMonthStart, prevMonthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportPdf = async () => {
    setExportError(null);
    setExporting(true);
    const iosPreview = openIosBlobPreviewWindow();
    try {
      const { blob, filename } = await exportMonthlyReport({
        year: currentYear,
        month: now.getMonth() + 1,
      });
      await downloadOrShareBlob(blob, filename, iosPreview);
    } catch (err) {
      if (iosPreview && !iosPreview.closed) iosPreview.close();
      setExportError(
        (err as Error)?.message ?? t("analytics.exportError"),
      );
    } finally {
      setExporting(false);
    }
  };

  const categoryBreakdown = categories.map((item, i) => ({
    id: item.categoryId,
    name: item.name,
    amountStr: formatMoney(item.expense),
    amountMinor: item.expense_minor,
    share:
      totalExpenseMinor > 0
        ? Math.round((item.expense_minor / totalExpenseMinor) * 100)
        : 0,
    color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  const conicGradient = categoryBreakdown.reduce<{ acc: string; prev: number }>(
    ({ acc, prev }, item) => {
      const next = prev + item.share;
      const part = `${item.color} ${prev}% ${next}%`;
      return { acc: acc ? `${acc}, ${part}` : part, prev: next };
    },
    { acc: "", prev: 0 },
  ).acc;

  const monthlyRows = monthly?.months ?? [];

  const incomeVsExpense = monthlyRows.slice(-6).map((m) => ({
    id: m.month,
    label: getMonthLabel(m.month, locale),
    incomeMinor: toMinor(m.income),
    expenseMinor: Math.abs(toMinor(m.expense)),
    incomeStr: formatMoney(m.income),
    expenseStr: formatMoney(m.expense),
  }));

  const maxChartValue = Math.max(
    ...incomeVsExpense.flatMap((x) => [x.incomeMinor, x.expenseMinor]),
    1,
  );

  const trendLast4 = trends.slice(-4);
  const maxTrendBar = Math.max(
    ...trendLast4.map((t) => Math.abs(t.net_minor ?? 0)),
    1,
  );

  const topCategory = categoryBreakdown[0];
  const reportMonth = formatDateLocale(
    new Date(currentYear, now.getMonth(), 1),
    locale,
    { month: "short", year: "numeric" },
  );

  const trendDelta = (() => {
    if (trends.length < 2) return "—";
    const a = trends[trends.length - 2]?.net_minor ?? 0;
    const b = trends[trends.length - 1]?.net_minor ?? 0;
    if (a === 0) return "—";
    const pct = Math.round(((b - a) / Math.abs(a)) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  })();

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const maxSavingsRate = Math.max(
    ...savingsRate.map((s) => Math.abs(s.saved_minor ?? 0)),
    1,
  );

  if (hasAccounts === false) {
    return (
      <AppShell
        active="analytics"
        title={t("analytics.title")}
        subtitle={t("analytics.subtitle")}
      >
        <section className="grid grid-cols-1 gap-5">
          <p className="metric-label text-[var(--ink-muted)]">
            {t("analytics.redirecting")}
          </p>
        </section>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell
        active="analytics"
        title={t("analytics.title")}
        subtitle={t("analytics.subtitle")}
      >
        <section className="grid grid-cols-1 gap-5">
          <div className="metric-label">{t("common.loading")}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        active="analytics"
        title={t("analytics.title")}
        subtitle={t("analytics.subtitle")}
      >
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="analytics"
      title={t("analytics.title")}
      subtitle={t("analytics.subtitle")}
      actionAs={
        <button
          type="button"
          className="action-btn"
          onClick={handleExportPdf}
          disabled={exporting}
        >
          {exporting ? t("analytics.exporting") : t("analytics.exportReport")}
        </button>
      }
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          {exportError ? (
            <div className="alert alert-warn" role="alert">
              {exportError}
            </div>
          ) : null}

          {/* Расходы по категориям (donut) */}
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("analytics.expensesByCategory")}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              {reportMonth}
            </p>
            {categories.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink-muted)]">
                {t("analytics.noExpenseData")}
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr] md:items-center">
                <div
                  className="analytics-donut"
                  style={{
                    background: conicGradient
                      ? `conic-gradient(${conicGradient})`
                      : "var(--surface-2)",
                  }}
                >
                  <div className="analytics-donut-hole">
                    <p className="mono text-xs text-[var(--ink-muted)]">
                      {t("analytics.expenses")}
                    </p>
                    <p className="mono mt-1 text-lg font-semibold text-[var(--ink-strong)]">
                      {totalExpenseStr ||
                        (totalExpenseMinor > 0
                          ? `${formatNumberLocale(totalExpenseMinor, locale)} ₸`
                          : "—")}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div key={item.id} className="analytics-legend-row">
                      <span
                        className="analytics-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-[var(--ink-strong)]">
                        {item.name}
                      </span>
                      <span className="mono text-[var(--ink-soft)]">
                        {item.amountStr}
                      </span>
                      <span className="mono text-[var(--ink-muted)]">
                        {item.share}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Топ-5 категорий расходов */}
          {topCategories.length > 0 && (
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("analytics.topCategories")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                {reportMonth}
              </p>
              <div className="mt-4 space-y-3">
                {topCategories.map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-base text-[var(--ink-muted)]">
                      {item.icon ?? (
                        <Package
                          className="h-4 w-4"
                          aria-hidden
                          strokeWidth={2}
                        />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[var(--ink-strong)]">
                          <span className="mr-1.5 text-xs text-[var(--ink-muted)]">
                            #{item.rank ?? "—"}
                          </span>
                          {item.name}
                        </span>
                        <span className="mono shrink-0 text-sm text-[var(--ink-strong)]">
                          {formatMoney(item.expense)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${item.share_pct ?? 0}%` }}
                          />
                        </div>
                        <span className="mono shrink-0 text-xs text-[var(--ink-muted)]">
                          {item.share_pct ?? 0}%
                        </span>
                        <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                          {t("analytics.txCount").replace("{count}", String(item.tx_count))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Доходы vs расходы по месяцам */}
          <article className="card p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("analytics.monthlyIncomeExpense")}
              </h2>
              <select
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--ink-strong)]"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                {t("analytics.noDataForYear").replace("{year}", String(selectedYear))}
              </p>
            ) : (
              <>
                {incomeVsExpense.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                    <div
                      className="flex items-end gap-2"
                      style={{ height: "10rem" }}
                    >
                      {incomeVsExpense.map((m) => {
                        const incH = Math.max(
                          4,
                          Math.round((m.incomeMinor / maxChartValue) * 152),
                        );
                        const expH = Math.max(
                          4,
                          Math.round((m.expenseMinor / maxChartValue) * 152),
                        );
                        return (
                          <div
                            key={m.id}
                            className="flex flex-1 flex-col items-center gap-1"
                            title={t("analytics.chartTooltip")
                              .replace("{label}", m.label)
                              .replace("{income}", m.incomeStr)
                              .replace("{expense}", m.expenseStr)}
                          >
                            <div
                              className="flex w-full items-end justify-center gap-0.5"
                              style={{ height: "8rem" }}
                            >
                              <div
                                className="flex-1 rounded-t-sm bg-[#166534] opacity-80 transition-all"
                                style={{ height: `${incH}px` }}
                                title={t("analytics.chartIncome").replace("{amount}", m.incomeStr)}
                              />
                              <div
                                className="flex-1 rounded-t-sm bg-[#9f1239] opacity-80 transition-all"
                                style={{ height: `${expH}px` }}
                                title={t("analytics.chartExpense").replace("{amount}", m.expenseStr)}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--ink-muted)]">
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="analytics-pill">
                        <span className="analytics-pill-dot bg-[#166534]" />{" "}
                        {t("analytics.income")}
                      </div>
                      <div className="analytics-pill">
                        <span className="analytics-pill-dot bg-[#9f1239]" />{" "}
                        {t("analytics.expense")}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="pb-2 text-left font-medium text-[var(--ink-muted)]">
                          {t("analytics.month")}
                        </th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                          {t("analytics.incomeCol")}
                        </th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                          {t("analytics.expenseCol")}
                        </th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                          {t("analytics.netCol")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((m) => {
                        const inc = toMinor(m.income);
                        const exp = toMinor(m.expense);
                        const net = inc - Math.abs(exp);
                        return (
                          <tr
                            key={m.month}
                            className="border-b border-[var(--line)] last:border-0"
                          >
                            <td className="py-2 text-[var(--ink-soft)]">
                              {getMonthLabel(m.month, locale)}
                            </td>
                            <td className="py-2 text-right font-medium text-[#166534] mono">
                              {formatMoney(m.income)}
                            </td>
                            <td className="py-2 text-right font-medium text-[#9f1239] mono">
                              {formatMoney(m.expense)}
                            </td>
                            <td
                              className={`py-2 text-right mono font-semibold ${net >= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}
                            >
                              {net >= 0 ? "+" : ""}
                              {formatNumberLocale(net, locale)} ₸
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>

          {/* Чистый баланс: тренд */}
          {trendLast4.length > 0 && (
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("analytics.netTrend")}
              </h2>
              <div className="mt-4 grid grid-cols-4 items-end gap-3">
                {trendLast4.map((t, i, arr) => {
                  const prev = arr[i - 1]?.net_minor;
                  const trend =
                    prev != null && prev !== 0
                      ? `${t.net_minor >= prev ? "+" : ""}${Math.round(((t.net_minor - prev) / Math.abs(prev)) * 100)}%`
                      : "—";
                  return (
                    <div key={t.month} className="space-y-2">
                      <div className="analytics-bar-wrap">
                        <div
                          className={`analytics-bar ${t.net_minor < 0 ? "!bg-[#9f1239]" : ""}`}
                          style={{
                            height: `${Math.min(100, (Math.abs(t.net_minor) / maxTrendBar) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mono text-center text-xs text-[var(--ink-strong)]">
                        {getMonthLabel(t.month, locale)}
                      </p>
                      <p className="mono text-center text-[10px] text-[var(--ink-muted)]">
                        {trend}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* Норма сбережений */}
          {savingsRate.length > 0 && (
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("analytics.savingsRate")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                {t("analytics.savingsRateHint").replace(
                  "{count}",
                  String(savingsRate.length),
                )}
              </p>

              {/* Мобильная версия: карточки */}
              <div className="mt-4 space-y-3 md:hidden">
                {savingsRate.map((s) => {
                  const badge = statusBadge(s.status, t);
                  const barH = Math.max(
                    4,
                    Math.round((Math.abs(s.saved_minor) / maxSavingsRate) * 40),
                  );
                  const barColor =
                    s.status === "good"
                      ? "#166534"
                      : s.status === "risk"
                        ? "#9f1239"
                        : "#b45309";
                  return (
                    <div
                      key={s.month}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--ink-strong)]">
                          {getMonthLabel(s.month, locale)}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                            {t("analytics.income")}
                          </p>
                          <p className="mono font-medium text-[#166534]">
                            {formatMoney(s.income)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                            {t("analytics.expense")}
                          </p>
                          <p className="mono font-medium text-[#9f1239]">
                            {formatMoney(s.expense)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                            {t("analytics.savings")}
                          </p>
                          <p className="mono font-semibold text-[var(--ink-strong)]">
                            {formatMoney(s.saved)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                            {t("analytics.pctOfIncome")}
                          </p>
                          <p className="mono font-semibold text-[var(--ink-strong)]">
                            {s.savings_rate_pct}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-end gap-1 rounded-lg bg-white/60 px-2 py-2">
                        <div
                          className="min-h-[4px] flex-1 rounded-t-sm transition-[height]"
                          style={{
                            height: `${barH}px`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Десктоп: таблица */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="pb-2 text-left font-medium text-[var(--ink-muted)]">
                        {t("analytics.monthShort")}
                      </th>
                      <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                        {t("analytics.incomeCol")}
                      </th>
                      <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                        {t("analytics.expenseCol")}
                      </th>
                      <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                        {t("analytics.savings")}
                      </th>
                      <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                        {t("analytics.percent")}
                      </th>
                      <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">
                        {t("analytics.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsRate.map((s) => {
                      const badge = statusBadge(s.status, t);
                      return (
                        <tr
                          key={s.month}
                          className="border-b border-[var(--line)] last:border-0"
                        >
                          <td className="py-2 text-[var(--ink-soft)]">
                            {getMonthLabel(s.month, locale)}
                          </td>
                          <td className="py-2 text-right mono text-[#166534]">
                            {formatMoney(s.income)}
                          </td>
                          <td className="py-2 text-right mono text-[#9f1239]">
                            {formatMoney(s.expense)}
                          </td>
                          <td className="py-2 text-right mono font-medium text-[var(--ink-strong)]">
                            {formatMoney(s.saved)}
                          </td>
                          <td className="py-2 text-right mono font-semibold text-[var(--ink-strong)]">
                            {s.savings_rate_pct}%
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 hidden items-end gap-1.5 md:flex">
                {savingsRate.map((s) => (
                  <div
                    key={s.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${Math.max(4, Math.round((Math.abs(s.saved_minor ?? 0) / maxSavingsRate) * 48))}px`,
                        backgroundColor:
                          s.status === "good"
                            ? "#166534"
                            : s.status === "risk"
                              ? "#9f1239"
                              : "#b45309",
                      }}
                    />
                    <span className="text-[9px] text-[var(--ink-muted)]">
                      {getMonthLabel(s.month, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Сравнение периодов */}
          {compare?.diff && compare.period_a && compare.period_b && (
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("analytics.compare")}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: t("analytics.prevMonth"), period: compare.period_a },
                  { label: t("analytics.currentMonth"), period: compare.period_b },
                ].map(({ label, period }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                      {label}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-soft)]">{t("analytics.income")}</span>
                        <span className="mono font-medium text-[#166534]">
                          {formatMoney(period.income)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-soft)]">{t("analytics.expense")}</span>
                        <span className="mono font-medium text-[#9f1239]">
                          {formatMoney(period.expense)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--line)] pt-2">
                        <span className="text-[var(--ink-soft)]">{t("analytics.net")}</span>
                        <span
                          className={`mono font-semibold ${toMinor(period.net) >= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}
                        >
                          {formatMoney(period.net)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-soft)]">
                          {t("analytics.transactions")}
                        </span>
                        <span className="mono text-[var(--ink-strong)]">
                          {period.tx_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line)] p-3 text-center">
                  <p className="text-xs text-[var(--ink-muted)]">
                    {t("analytics.incomeChanged")}
                  </p>
                  <p
                    className={`mono mt-1 text-lg font-bold ${(compare.diff.income_change_pct ?? 0) >= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}
                  >
                    {fmtPct(compare.diff.income_change_pct ?? 0)}
                  </p>
                  <p className="mono text-xs text-[var(--ink-muted)]">
                    {formatMoney(compare.diff.income_change)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] p-3 text-center">
                  <p className="text-xs text-[var(--ink-muted)]">
                    {t("analytics.expenseChanged")}
                  </p>
                  <p
                    className={`mono mt-1 text-lg font-bold ${(compare.diff.expense_change_pct ?? 0) <= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}
                  >
                    {fmtPct(compare.diff.expense_change_pct ?? 0)}
                  </p>
                  <p className="mono text-xs text-[var(--ink-muted)]">
                    {formatMoney(compare.diff.expense_change)}
                  </p>
                </div>
              </div>
            </article>
          )}

          {/* Финансовый отчёт месяца */}
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("analytics.monthlyReport")}
            </h2>
            <div className="monthly-report mt-4">
              <p className="mono text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                {reportMonth}
              </p>
              <p className="mono mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                {t("analytics.balance")}{" "}
                {summary
                  ? `${formatMoney(summary.balance)} ${summary.currency ?? ""}`.trim()
                  : "—"}
              </p>
              {reportSummary && (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                    {t("analytics.aiSummary")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-strong)]">
                    {reportSummary.summaryText}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    {reportSummary.shareReadyText}
                  </p>
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="metric-row">
                  <span>{t("analytics.topCategory")}</span>
                  <span className="mono">
                    {topCategory
                      ? `${topCategory.name} ${topCategory.share}%`
                      : "—"}
                  </span>
                </div>
                <div className="metric-row">
                  <span>{t("analytics.finIndex")}</span>
                  <span className="mono">
                    {dashboardIndexEnabled && index != null
                      ? `${index.score ?? "—"} / 100`
                      : dashboardIndexEnabled
                        ? "—"
                        : (
                          <Link className="underline" href={ROUTES.pricing}>
                            Pro
                          </Link>
                        )}
                  </span>
                </div>
                <div className="metric-row">
                  <span>{t("analytics.vsPrevMonth")}</span>
                  <span
                    className={`mono ${trendDelta.startsWith("+") ? "text-[#166534]" : trendDelta.startsWith("-") ? "text-[#9f1239]" : ""}`}
                  >
                    {trendDelta}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="action-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                  onClick={handleExportPdf}
                  disabled={exporting}
                >
                  {exporting ? t("analytics.exporting") : t("analytics.exportPdf")}
                </button>
                <ActionInfoModal
                  confirmLabel={t("analytics.shareConfirm")}
                  description={t("analytics.shareDescription")}
                  items={[
                    t("analytics.shareItemStory"),
                    t("analytics.shareItemMessengers"),
                    t("analytics.shareItemEmail"),
                  ]}
                  title={t("analytics.shareReport")}
                  triggerClassName="tx-inline-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                  triggerLabel={t("analytics.shareConfirm")}
                />
              </div>
            </div>
          </article>
        </div>

        <aside className="flex flex-col gap-5">
          {/* Heatmap расходов */}
          {heatmapDays.length > 0 && (
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                {t("analytics.heatmap")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                {t("analytics.heatmapDays")}
              </p>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {heatmapDays.map((d, i) => {
                  const intensity = d.intensity ?? 0;
                  const bg =
                    intensity >= 75
                      ? "#0f172a"
                      : intensity >= 50
                        ? "#334155"
                        : intensity >= 25
                          ? "#94a3b8"
                          : intensity > 0
                            ? "#cbd5e1"
                            : "#e2e8f0";
                  const label = d.day ?? d.date ?? "";
                  const amountStr =
                    formatMoney(d.total) ||
                    `${formatNumberLocale(d.total_minor ?? 0, locale)} ₸`;
                  const title = label
                    ? t("analytics.heatmapTooltip")
                        .replace("{date}", label)
                        .replace("{amount}", amountStr)
                    : undefined;
                  return (
                    <div
                      key={`d-${i}`}
                      className="analytics-heat"
                      style={{ backgroundColor: bg }}
                      title={title}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[var(--ink-muted)]">{t("analytics.less")}</span>
                <div className="flex gap-1">
                  {["#e2e8f0", "#cbd5e1", "#94a3b8", "#334155", "#0f172a"].map(
                    (c) => (
                      <div
                        key={c}
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: c }}
                      />
                    ),
                  )}
                </div>
                <span className="text-xs text-[var(--ink-muted)]">{t("analytics.more")}</span>
              </div>
              {heatmapExplanation && (
                <p className="mt-3 text-xs text-[var(--ink-muted)]">
                  {heatmapExplanation}
                </p>
              )}
            </article>
          )}

          {/* Аномалии расходов */}
          {anomalies.length > 0 ? (
            <article className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                  {t("analytics.anomalies")}
                </h2>
                {anomaliesStatus === "anomaly_detected" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {t("analytics.anomaliesDetected")}
                  </span>
                )}
                {anomaliesStatus === "stable" && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {t("common.severity.stable")}
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {anomalies.map((a, i) => {
                  const month = a.month ?? a.period ?? "";
                  const deviationPct = a.deviation_pct;
                  const note = a.note ?? a.explanation ?? "";
                  return (
                    <div key={a.id ?? `a-${i}`} className="alert alert-warn">
                      <div className="flex items-start justify-between gap-2">
                        <p className="mono text-xs text-[#92400e]">
                          {month ? getMonthLabel(month, locale) : "—"}
                        </p>
                        {deviationPct != null && (
                          <span className="mono text-xs font-semibold text-[#b45309]">
                            {t("analytics.deviationFromAvg").replace(
                              "{pct}",
                              String(Math.round(deviationPct)),
                            )}
                          </span>
                        )}
                      </div>
                      {a.expense != null && (
                        <p className="mt-1 text-sm text-[#78350f]">
                          {t("analytics.expenseLabel")}{" "}
                          <span className="font-semibold">
                            {formatMoney(a.expense)}
                          </span>
                          {a.avg_expense != null && (
                            <>
                              {" "}
                              · {t("analytics.avgLabel")} {formatMoney(a.avg_expense)}
                            </>
                          )}
                        </p>
                      )}
                      {note && (
                        <p className="mt-1 text-sm text-[#78350f]">{note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ) : anomaliesStatus === "stable" ? (
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                {t("analytics.anomalies")}
              </h2>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {t("common.severity.stable")}
                </span>
                <p className="text-sm text-[var(--ink-muted)]">
                  {t("analytics.noAnomalies")}
                </p>
              </div>
            </article>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}
