"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/shared/lib";
import { ActionInfoModal } from "@/shared/ui";
import { AppShell } from "@/widgets/app-shell";
import {
  getAnalyticsCategories,
  getAnalyticsMonthly,
  getAnalyticsTrends,
  getAnalyticsHeatmap,
  getAnalyticsAnomalies,
  exportMonthlyReport,
  getDashboardSummary,
  getDashboardIndex,
} from "@/shared/api";
import type {
  AnalyticsCategoryItem,
  AnalyticsMonthlyResponse,
  AnalyticsTrendItem,
  AnalyticsHeatmapDay,
  AnalyticsAnomalyItem,
  DashboardSummary,
  DashboardIndex,
} from "@/shared/api";

const DEFAULT_COLORS = [
  "#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0",
];

const MONTH_LABELS: Record<string, string> = {
  "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр", "05": "Май", "06": "Июн",
  "07": "Июл", "08": "Авг", "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

function getMonthLabel(ym: string): string {
  const parts = ym.split("-");
  return parts.length === 2 ? MONTH_LABELS[parts[1]] ?? parts[1] : ym;
}

function buildPoints(values: number[]): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((v, i) => {
      const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Достаёт amount_minor из AnalyticsMoneyDto или числа */
function toMinor(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "amount_minor" in value)
    return (value as { amount_minor: number }).amount_minor;
  return 0;
}

export function AnalyticsPageContent() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [categories, setCategories] = useState<AnalyticsCategoryItem[]>([]);
  const [totalExpenseStr, setTotalExpenseStr] = useState("");
  const [totalExpenseMinor, setTotalExpenseMinor] = useState(0);
  const [monthly, setMonthly] = useState<AnalyticsMonthlyResponse | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendItem[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<AnalyticsHeatmapDay[]>([]);
  const [heatmapExplanation, setHeatmapExplanation] = useState("");
  const [anomalies, setAnomalies] = useState<AnalyticsAnomalyItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [index, setIndex] = useState<DashboardIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1);
  const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0);
  const dateFrom = firstDayOfMonth.toISOString().slice(0, 10);
  const dateTo = lastDayOfMonth.toISOString().slice(0, 10);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getAnalyticsCategories({ dateFrom, dateTo }),
      getAnalyticsMonthly(selectedYear),
      getAnalyticsTrends(6),
      getAnalyticsHeatmap().catch(() => ({ days: [], explanation: "" })),
      getAnalyticsAnomalies().catch(() => ({ items: [], status: "" })),
      getDashboardSummary().catch(() => null),
      getDashboardIndex().catch(() => null),
    ])
      .then(([catRes, monthlyRes, trendsRes, heatmapRes, anomaliesRes, summaryRes, indexRes]) => {
        setCategories(catRes.items ?? []);
        setTotalExpenseMinor(catRes.total_expense_minor ?? 0);
        setTotalExpenseStr(formatMoney(catRes.total_expense));
        setMonthly(monthlyRes);
        setTrends(trendsRes.items ?? []);
        setHeatmapDays(Array.isArray(heatmapRes.days) ? heatmapRes.days : []);
        setHeatmapExplanation(heatmapRes.explanation ?? "");
        setAnomalies(Array.isArray(anomaliesRes.items) ? anomaliesRes.items : []);
        setSummary(summaryRes ?? null);
        setIndex(indexRes ?? null);
      })
      .catch((err) => setError(err?.message ?? "Не удалось загрузить аналитику"))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, selectedYear]);

  useEffect(() => { load(); }, [load]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await exportMonthlyReport({ year: currentYear, month: now.getMonth() + 1 });
      if (res?.url) window.open(res.url, "_blank");
    } finally {
      setExporting(false);
    }
  };

  const categoryBreakdown = categories.map((item, i) => ({
    id: item.categoryId,
    name: item.name,
    amountStr: formatMoney(item.expense),
    amountMinor: item.expense_minor,
    share: totalExpenseMinor > 0 ? Math.round((item.expense_minor / totalExpenseMinor) * 100) : 0,
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
    label: getMonthLabel(m.month),
    incomeMinor: toMinor(m.income),
    expenseMinor: Math.abs(toMinor(m.expense)),
    incomeStr: formatMoney(m.income),
    expenseStr: formatMoney(m.expense),
  }));

  const incomePoints = buildPoints(incomeVsExpense.map((x) => x.incomeMinor));
  const expensePoints = buildPoints(incomeVsExpense.map((x) => x.expenseMinor));

  const trendLast4 = trends.slice(-4);
  const maxTrendBar = Math.max(...trendLast4.map((t) => Math.abs(t.net_minor)), 1);

  const heatmapCells = heatmapDays.map((d, i) => ({
    id: `d-${i}`,
    level: d.level ?? 1,
    anomaly: d.anomaly ?? false,
  }));

  const anomalyList = anomalies.map((a, i) => ({
    id: a.id ?? `a-${i}`,
    period: a.period ?? "",
    note: a.note ?? a.explanation ?? "",
  }));

  const topCategory = categoryBreakdown[0];
  const reportMonth = `${MONTH_LABELS[String(now.getMonth() + 1).padStart(2, "0")]} ${currentYear}`;

  const trendDelta = (() => {
    if (trends.length < 2) return "—";
    const a = trends[trends.length - 2]?.net_minor ?? 0;
    const b = trends[trends.length - 1]?.net_minor ?? 0;
    if (a === 0) return "—";
    const pct = Math.round(((b - a) / Math.abs(a)) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  })();

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <AppShell active="analytics" title="Аналитика" subtitle="Структура расходов, динамика, аномалии и месячный отчёт.">
        <section className="grid grid-cols-1 gap-5">
          <div className="metric-label">Загрузка…</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="analytics" title="Аналитика" subtitle="Структура расходов, динамика, аномалии и месячный отчёт.">
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="analytics"
      title="Аналитика"
      subtitle="Структура расходов, динамика, аномалии и месячный отчёт."
      actionAs={
        <button type="button" className="action-btn" onClick={handleExportPdf} disabled={exporting}>
          {exporting ? "Формируем…" : "Экспорт отчёта"}
        </button>
      }
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">

          {/* Breakdown по категориям */}
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              Расходы по категориям
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{reportMonth}</p>
            {categories.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink-muted)]">Нет данных о расходах за текущий месяц.</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr] md:items-center">
                <div
                  className="analytics-donut"
                  style={{ background: conicGradient ? `conic-gradient(${conicGradient})` : "var(--surface-2)" }}
                >
                  <div className="analytics-donut-hole">
                    <p className="mono text-xs text-[var(--ink-muted)]">Расходы</p>
                    <p className="mono mt-1 text-lg font-semibold text-[var(--ink-strong)]">
                      {totalExpenseStr || (totalExpenseMinor > 0 ? `${(totalExpenseMinor / 100).toLocaleString("ru-KZ")} ₸` : "—")}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div key={item.id} className="analytics-legend-row">
                      <span className="analytics-dot" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-[var(--ink-strong)]">{item.name}</span>
                      <span className="mono text-[var(--ink-soft)]">{item.amountStr}</span>
                      <span className="mono text-[var(--ink-muted)]">{item.share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Доходы vs расходы по месяцам */}
          <article className="card p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                Доход / Расход по месяцам
              </h2>
              <select
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--ink-strong)]"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Нет данных за {selectedYear} год.</p>
            ) : (
              <>
                {/* График SVG */}
                {incomeVsExpense.length > 0 && (incomePoints || expensePoints) && (
                  <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                    <svg className="h-44 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <title>Динамика дохода и расходов по месяцам</title>
                      {incomePoints && (
                        <polyline fill="none" points={incomePoints} stroke="#166534" strokeWidth="1.8" />
                      )}
                      {expensePoints && (
                        <polyline fill="none" points={expensePoints} stroke="#9f1239" strokeWidth="1.8" />
                      )}
                    </svg>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="analytics-pill"><span className="analytics-pill-dot bg-[#166534]" /> Доход</div>
                      <div className="analytics-pill"><span className="analytics-pill-dot bg-[#9f1239]" /> Расход</div>
                    </div>
                  </div>
                )}

                {/* Таблица по месяцам */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)]">
                        <th className="pb-2 text-left font-medium text-[var(--ink-muted)]">Месяц</th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">Доход</th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">Расход</th>
                        <th className="pb-2 text-right font-medium text-[var(--ink-muted)]">Чистый</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((m) => {
                        const inc = toMinor(m.income);
                        const exp = toMinor(m.expense);
                        const net = inc - Math.abs(exp);
                        return (
                          <tr key={m.month} className="border-b border-[var(--line)] last:border-0">
                            <td className="py-2 text-[var(--ink-soft)]">{getMonthLabel(m.month)}</td>
                            <td className="py-2 text-right font-medium text-[#166534] mono">{formatMoney(m.income)}</td>
                            <td className="py-2 text-right font-medium text-[#9f1239] mono">{formatMoney(m.expense)}</td>
                            <td className={`py-2 text-right mono font-semibold ${net >= 0 ? "text-[#166534]" : "text-[#9f1239]"}`}>
                              {net >= 0 ? "+" : ""}{(net / 100).toLocaleString("ru-KZ")} ₸
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

          {/* Сравнение месяцев (тренды) */}
          {trendLast4.length > 0 && (
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Чистый баланс: тренд</h2>
              <div className="mt-4 grid grid-cols-4 items-end gap-3">
                {trendLast4.map((t, i, arr) => {
                  const prev = arr[i - 1]?.net_minor;
                  const trend = prev != null && prev !== 0
                    ? `${t.net_minor >= prev ? "+" : ""}${Math.round(((t.net_minor - prev) / Math.abs(prev)) * 100)}%`
                    : "—";
                  return (
                    <div key={t.month} className="space-y-2">
                      <div className="analytics-bar-wrap">
                        <div
                          className="analytics-bar"
                          style={{ height: `${Math.min(100, (Math.abs(t.net_minor) / maxTrendBar) * 100)}%` }}
                        />
                      </div>
                      <p className="mono text-center text-xs text-[var(--ink-strong)]">{getMonthLabel(t.month)}</p>
                      <p className="mono text-center text-[10px] text-[var(--ink-muted)]">{trend}</p>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          {/* Финансовый отчёт месяца */}
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Финансовый отчёт месяца</h2>
            <div className="monthly-report mt-4">
              <p className="mono text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">{reportMonth}</p>
              <p className="mono mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                Баланс: {summary ? `${formatMoney(summary.balance)} ${summary.currency ?? ""}`.trim() : "—"}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="metric-row">
                  <span>Топ-категория</span>
                  <span className="mono">{topCategory ? `${topCategory.name} ${topCategory.share}%` : "—"}</span>
                </div>
                <div className="metric-row">
                  <span>Фин. индекс</span>
                  <span className="mono">{index != null ? `${index.score} / 100` : "—"}</span>
                </div>
                <div className="metric-row">
                  <span>К прошлому мес.</span>
                  <span className={`mono ${trendDelta.startsWith("+") ? "text-[#166534]" : trendDelta.startsWith("-") ? "text-[#9f1239]" : ""}`}>
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
                  {exporting ? "Формируем…" : "Экспорт PDF"}
                </button>
                <ActionInfoModal
                  confirmLabel="Поделиться"
                  description="Отчёт готов для публикации. Выберите канал и отправьте визуальную карточку за месяц."
                  items={["Instagram Story (1080x1920)", "Telegram/WhatsApp как изображение", "PDF вложением по email"]}
                  title="Поделиться отчётом"
                  triggerClassName="tx-inline-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                  triggerLabel="Поделиться"
                />
              </div>
            </div>
          </article>
        </div>

        <aside className="flex flex-col gap-5">
          {heatmapCells.length > 0 && (
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">Heatmap расходов</h2>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {heatmapCells.map((cell) => (
                  <div
                    key={cell.id}
                    className={`analytics-heat ${cell.anomaly ? "anomaly" : ""}`}
                    style={{
                      backgroundColor:
                        cell.level === 4 ? "#0f172a"
                        : cell.level === 3 ? "#334155"
                        : cell.level === 2 ? "#94a3b8"
                        : "#e2e8f0",
                    }}
                  />
                ))}
              </div>
              {heatmapExplanation && (
                <p className="mt-3 text-xs text-[var(--ink-muted)]">{heatmapExplanation}</p>
              )}
            </article>
          )}

          {anomalyList.length > 0 && (
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">Аномалии расходов</h2>
              <div className="mt-4 space-y-2">
                {anomalyList.map((item) => (
                  <div key={item.id} className="alert alert-warn">
                    <p className="mono text-xs text-[#92400e]">{item.period}</p>
                    <p className="mt-1 text-sm text-[#78350f]">{item.note}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
