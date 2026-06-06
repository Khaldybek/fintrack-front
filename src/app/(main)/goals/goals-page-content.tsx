"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlan } from "@/app/providers/plan-provider";
import { UpgradeModal } from "@/features/upgrade/ui/upgrade-modal";
import { ROUTES } from "@/shared/config";
import { useI18n, type Locale } from "@/shared/i18n";
import { formatDateLocale, formatNumberLocale } from "@/shared/lib/format-locale";
import { formatMoney, useBodyScrollLock } from "@/shared/lib";
import { isFeatureGatedError } from "@/shared/lib/is-feature-gated";
import { translateFeatureGatedHint } from "@/shared/lib/translate-severity";
import { AppShell } from "@/widgets/app-shell";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalEntry,
  getGoalEntries,
  getGoalAnalytics,
  FeatureGatedError,
} from "@/shared/api";
import type { Goal, GoalEntry, GoalAnalyticsResponse } from "@/shared/api";

function formatDeadline(dateStr: string, locale: Locale): string {
  if (!dateStr) return "";
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  if (!m || !y) return dateStr;
  return formatDateLocale(new Date(y, m - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });
}

function formatMonthYear(monthStr: string, locale: Locale): string {
  const [y, m] = monthStr.split("-").map(Number);
  if (!m || !y) return monthStr;
  return formatDateLocale(new Date(y, m - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });
}

function getMinor(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "amount_minor" in value)
    return (value as { amount_minor: number }).amount_minor;
  return 0;
}

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatEntryAmountInput(value: string): string {
  const isNeg = value.startsWith("-");
  const digits = value.replace(/[-\s]/g, "").replace(/\D/g, "");
  if (digits.length === 0) return isNeg ? "-" : "";
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return isNeg ? `- ${formatted}` : formatted;
}

function formatEntryDate(iso: string, locale: Locale): string {
  return formatDateLocale(iso, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityColor(sev: string | undefined): string {
  if (sev === "risk") return "text-[#9f1239]";
  if (sev === "attention") return "text-[#92400e]";
  return "text-[var(--ink-soft)]";
}

function progressBarColor(sev: string | undefined): string {
  if (sev === "risk") return "from-[#9f1239] to-[#be123c]";
  if (sev === "attention") return "from-[#b45309] to-[#d97706]";
  return "from-[#0f172a] to-[#475569]";
}

const ENTRIES_PAGE_SIZE = 20;

/** Контент без обёртки AppShell — для встраивания на объединённую страницу «Бюджеты и цели». */
export function GoalsSection() {
  const { t, locale } = useI18n();
  const { canAddGoal } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Создание
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formCurrency, setFormCurrency] = useState("KZT");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGated, setIsGated] = useState(false);

  // Детальный вид + история
  const [goalDetailId, setGoalDetailId] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryComment, setEntryComment] = useState("");
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [analytics, setAnalytics] = useState<GoalAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Редактирование / удаление
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const goalsOverlayOpen =
    modalOpen ||
    editGoal !== null ||
    goalDetailId !== null ||
    deleteConfirmId !== null;
  useBodyScrollLock(goalsOverlayOpen);

  const loadGoals = useCallback(() => {
    return getGoals()
      .then(setGoals)
      .catch((err) => setError(err?.message ?? t("goals.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const openModal = () => {
    if (!canAddGoal(goals.length)) {
      setUpgradeMessage(t("planGated.goals"));
      setUpgradeOpen(true);
      return;
    }
    setModalOpen(true);
    setFormError(null);
    setIsGated(false);
    setFormName(""); setFormTarget(""); setFormDate("");
    setFormCurrent(""); setFormCurrency("KZT");
  };

  const loadEntriesForGoal = useCallback((goalId: string, page: number, append: boolean) => {
    setEntriesLoading(true);
    getGoalEntries(goalId, page, ENTRIES_PAGE_SIZE)
      .then((res) => {
        setEntries((prev) => append ? [...prev, ...res.items] : res.items);
        setEntriesTotal(res.total);
        setEntriesPage(res.page);
      })
      .catch(() => {})
      .finally(() => setEntriesLoading(false));
  }, []);

  const loadAnalyticsForGoal = useCallback((goalId: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    getGoalAnalytics(goalId)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const openGoalDetail = (goal: Goal) => {
    setGoalDetailId(goal.id);
    setEntryAmount(""); setEntryComment(""); setEntryError(null);
    setEntries([]); setEntriesTotal(0); setEntriesPage(1); setAnalytics(null);
    loadEntriesForGoal(goal.id, 1, false);
    loadAnalyticsForGoal(goal.id);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalDetailId) return;
    setEntryError(null);
    const raw = entryAmount.replace(/\s/g, "").replace(",", ".");
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num === 0) {
      setEntryError(t("goals.entryAmountInvalid"));
      return;
    }
    // API целей ожидает сумму в целых единицах (как target_minor/current_minor), не в тиынах
    const amountMinor = Math.round(num);
    setEntrySubmitting(true);
    try {
      const { entry, goal: updatedGoal } = await addGoalEntry(goalDetailId, {
        amountMinor,
        comment: entryComment.trim() || undefined,
      });
      setGoals((prev) => prev.map((g) => g.id === goalDetailId ? updatedGoal : g));
      setEntries((prev) => [entry, ...prev]);
      setEntriesTotal((prev) => prev + 1);
      setEntryAmount(""); setEntryComment("");
      // обновить аналитику
      loadAnalyticsForGoal(goalDetailId);
    } catch (err) {
      setEntryError((err as Error)?.message ?? t("goals.entryAddError"));
    } finally {
      setEntrySubmitting(false);
    }
  };

  const loadMoreEntries = () => {
    if (!goalDetailId || entriesLoading) return;
    loadEntriesForGoal(goalDetailId, entriesPage + 1, true);
  };

  const openEdit = (goal: Goal) => {
    setEditGoal(goal);
    setFormName(goal.name);
    // getMinor работает с MoneyDto | string | number
    const t = getMinor(goal.target_minor ?? goal.target);
    const c = getMinor(goal.current_minor ?? goal.current);
    setFormTarget(t ? formatAmountInput(String(Math.round(t))) : "");
    setFormCurrent(c ? formatAmountInput(String(Math.round(c))) : "");
    setFormDate(goal.target_date?.slice(0, 10) ?? "");
    setFormCurrency(goal.currency ?? "KZT");
    setFormError(null);
  };

  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    setFormError(null);
    const name = formName.trim();
    const targetNum = parseFloat(formTarget.replace(/\s/g, ""));
    const currentNum = formCurrent ? parseFloat(formCurrent.replace(/\s/g, "")) : 0;
    if (!name) { setFormError(t("goals.nameRequired")); return; }
    if (!Number.isFinite(targetNum) || targetNum <= 0) { setFormError(t("goals.targetInvalid")); return; }
    const targetMinor = Math.round(targetNum);
    const currentMinor = Number.isFinite(currentNum) && currentNum >= 0 ? Math.round(currentNum) : undefined;
    setSubmitting(true);
    try {
      await updateGoal(editGoal.id, {
        name, targetMinor, currentMinor,
        targetDate: formDate.trim() || undefined,
        currency: formCurrency || undefined,
      });
      await loadGoals();
      setEditGoal(null);
    } catch (err) {
      setFormError((err as Error)?.message ?? t("common.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      await loadGoals();
      setDeleteConfirmId(null);
    } catch {
      // silent
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsGated(false);
    const name = formName.trim();
    const targetNum = parseFloat(formTarget.replace(/\s/g, "").replace(",", "."));
    const currentNum = formCurrent ? parseFloat(formCurrent.replace(/\s/g, "").replace(",", ".")) : 0;
    if (!name) { setFormError(t("goals.nameRequired")); return; }
    if (!Number.isFinite(targetNum) || targetNum <= 0) { setFormError(t("goals.targetInvalid")); return; }
    const targetMinor = Math.round(targetNum);
    const currentMinor = Number.isFinite(currentNum) && currentNum >= 0 ? Math.round(currentNum) : undefined;
    let targetDate = formDate.trim();
    if (!targetDate) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      targetDate = d.toISOString().slice(0, 10);
    }
    setSubmitting(true);
    try {
      await createGoal({ name, targetMinor, currentMinor, targetDate, currency: formCurrency || undefined });
      await loadGoals();
      setModalOpen(false);
    } catch (err) {
      if (err instanceof FeatureGatedError || isFeatureGatedError(err)) {
        setIsGated(true);
        const code =
          err instanceof FeatureGatedError
            ? err.featureCode
            : (err as { featureCode?: string }).featureCode;
        const hint =
          err instanceof FeatureGatedError
            ? err.upgradeHint
            : (err as { upgradeHint?: string }).upgradeHint;
        setFormError(translateFeatureGatedHint(code, hint, t));
      } else {
        setFormError((err as Error)?.message ?? t("goals.createError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="metric-label">{t("common.loading")}</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="grid grid-cols-1 gap-5">
        <div className="alert alert-warn">{error}</div>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button className="action-btn" type="button" onClick={openModal}>
          {t("goals.add")}
        </button>
      </div>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {goals.length === 0 ? (
            <div className="card p-5 md:p-6">
              <p className="text-sm text-[var(--ink-muted)]">
                {t("goals.empty")}
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const targetMinor = getMinor(goal.target_minor ?? goal.target);
              const currentMinor = getMinor(goal.current_minor ?? goal.current);
              const progress = goal.progress_percent ?? (targetMinor ? Math.round((currentMinor / targetMinor) * 100) : 0);
              const sev = goal.severity;

              return (
                <article key={goal.id} className="card p-5 md:p-6">
                  <p className="metric-label">
                    {t("goals.deadlineWithDate").replace(
                      "{date}",
                      formatDeadline(goal.target_date, locale),
                    )}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{goal.name}</h2>

                  <p className="mono mt-5 text-2xl font-semibold text-[var(--ink-strong)]">
                    {formatMoney(goal.current)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {t("goals.currentOf").replace("{amount}", formatMoney(goal.target))}
                  </p>

                  <div className="mt-4 h-2.5 rounded-full bg-[var(--surface-3)]">
                    <div
                      className={`h-2.5 rounded-full bg-gradient-to-r ${progressBarColor(sev)}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-sm ${severityColor(sev)}`}>{progress}%</span>
                    {goal.explanation && (
                      <span className={`text-xs ${severityColor(sev)}`}>{goal.explanation}</span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="action-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                      onClick={() => openGoalDetail(goal)}
                    >
                      {t("goals.topUpHistory")}
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                      onClick={() => openEdit(goal)}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn danger h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                      onClick={() => setDeleteConfirmId(goal.id)}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

      {/* Модал создания */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <button aria-label={t("common.close")} className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setModalOpen(false)} type="button" />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[480px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:max-h-[min(85dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{t("goals.createTitle")}</h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setModalOpen(false)}>{t("common.close")}</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <GoalForm
                  name={formName} setName={setFormName}
                  target={formTarget} setTarget={setFormTarget}
                  current={formCurrent} setCurrent={setFormCurrent}
                  date={formDate} setDate={setFormDate}
                  currency={formCurrency} setCurrency={setFormCurrency}
                  onSubmit={handleCreateGoal}
                  submitting={submitting}
                  error={formError}
                  isGated={isGated}
                  submitLabel={t("goals.createSubmit")}
                  onCancel={() => setModalOpen(false)}
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Детальный вид — история и операции */}
      {goalDetailId && (() => {
        const goal = goals.find((g) => g.id === goalDetailId);
        if (!goal) return null;
        const hasMoreEntries = entries.length < entriesTotal;
        return (
          <div className="fixed inset-0 z-[81] overflow-hidden">
            <button aria-label={t("common.close")} className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setGoalDetailId(null)} type="button" />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
              <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[540px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:max-h-[min(88dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
                <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                  <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                    <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{goal.name}</h3>
                      <p className="mono mt-0.5 text-xs text-[var(--ink-muted)]">
                        {t("goals.detailSummary")
                          .replace("{current}", formatMoney(goal.current))
                          .replace("{target}", formatMoney(goal.target))
                          .replace("{percent}", String(goal.progress_percent ?? 0))}
                      </p>
                    </div>
                    <button className="tx-inline-btn shrink-0" type="button" onClick={() => setGoalDetailId(null)}>{t("common.close")}</button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
              {/* Форма операции */}
              <form onSubmit={handleAddEntry} className="grid gap-3 rounded-xl border border-[var(--line)] p-3 md:p-4">
                <p className="text-sm font-medium text-[var(--ink-strong)]">{t("goals.entryTitle")}</p>
                {entryError && <div className="alert alert-warn">{entryError}</div>}
                <label className="auth-field">
                  <span>{t("goals.entryAmountLabel")}</span>
                  <input
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(formatEntryAmountInput(e.target.value))}
                    placeholder={t("goals.entryAmountPlaceholder")}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </label>
                <label className="auth-field">
                  <span>{t("goals.entryComment")}</span>
                  <input
                    value={entryComment}
                    onChange={(e) => setEntryComment(e.target.value)}
                    placeholder={t("goals.entryCommentPlaceholder")}
                    maxLength={2000}
                  />
                </label>
                <button className="action-btn" type="submit" disabled={entrySubmitting || !entryAmount.trim()}>
                  {entrySubmitting ? t("common.sending") : t("goals.addEntry")}
                </button>
              </form>

              {/* История операций */}
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--ink-strong)]">
                    {t("goals.historyTitle")}
                    {entriesTotal > 0 && <span className="ml-1 mono text-xs text-[var(--ink-muted)]">({entriesTotal})</span>}
                  </p>
                </div>
                {entriesLoading && entries.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">{t("goals.noEntries")}</p>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((entry) => {
                      // amountMinor приходит в целых единицах (как при создании цели), не в тиынах
                      const main = Math.abs(entry.amountMinor);
                      const isAdd = entry.amountMinor > 0;
                      return (
                        <li key={entry.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-[var(--ink-muted)]">{formatEntryDate(entry.createdAt, locale)}</span>
                            <span className={`mono font-semibold ${isAdd ? "text-[#166534]" : "text-[#9f1239]"}`}>
                              {isAdd ? "+" : "−"}{formatNumberLocale(main, locale)} ₸
                            </span>
                          </div>
                          {entry.comment && (
                            <p className="mt-1 text-[var(--ink-soft)]">{entry.comment}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {hasMoreEntries && (
                  <button type="button" className="tx-inline-btn mt-3 text-sm" onClick={loadMoreEntries} disabled={entriesLoading}>
                    {entriesLoading ? t("common.loading") : t("goals.loadMore").replace("{remaining}", String(entriesTotal - entries.length))}
                  </button>
                )}
              </div>

              {/* Аналитика */}
              <div className="mt-5 rounded-xl border border-[var(--line)] p-3 md:p-4">
                <p className="text-sm font-medium text-[var(--ink-strong)]">{t("goals.analytics")}</p>
                {analyticsLoading ? (
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
                ) : analytics ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[var(--ink-strong)]">{analytics.entriesCount}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{t("goals.entriesCountLabel")}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[#166534]">{formatMoney(analytics.totalAdded) || `${formatNumberLocale(analytics.totalAdded_minor ?? 0, locale)} ₸`}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{t("goals.totalAddedLabel")}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[#9f1239]">{formatMoney(analytics.totalWithdrawn) || `${formatNumberLocale(analytics.totalWithdrawn_minor ?? 0, locale)} ₸`}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{t("goals.totalWithdrawnLabel")}</p>
                      </div>
                    </div>

                    {analytics.byMonth && analytics.byMonth.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wide">{t("goals.byMonth")}</p>
                        <ul className="space-y-1.5">
                          {analytics.byMonth.map((row) => {
                            const label = formatMonthYear(row.month, locale);
                            const addedStr = formatMoney(row.added) || `+${formatNumberLocale(row.added_minor ?? 0, locale)} ₸`;
                            const withdrawnStr = formatMoney(row.withdrawn) || `−${formatNumberLocale(row.withdrawn_minor ?? 0, locale)} ₸`;
                            const hasWithdrawn = (row.withdrawn_minor ?? 0) !== 0;
                            return (
                              <li key={row.month} className="flex items-center justify-between gap-2 rounded-lg px-1 py-0.5">
                                <span className="text-[var(--ink-muted)]">{label}</span>
                                <span className="mono text-xs">
                                  <span className="text-[#166534]">{addedStr}</span>
                                  {hasWithdrawn && <span className="ml-2 text-[#9f1239]">{withdrawnStr}</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">{t("goals.noAnalytics")}</p>
                )}
              </div>
                </div>
              </section>
            </div>
          </div>
        );
      })()}

      {/* Модал редактирования */}
      {editGoal && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <button aria-label={t("common.close")} className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setEditGoal(null)} type="button" />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[480px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:max-h-[min(85dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {t("goals.editWithName").replace("{name}", editGoal.name)}
                  </h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setEditGoal(null)}>{t("common.close")}</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <GoalForm
                  name={formName} setName={setFormName}
                  target={formTarget} setTarget={setFormTarget}
                  current={formCurrent} setCurrent={setFormCurrent}
                  date={formDate} setDate={setFormDate}
                  currency={formCurrency} setCurrency={setFormCurrency}
                  onSubmit={handleEditGoal}
                  submitting={submitting}
                  error={formError}
                  isGated={false}
                  submitLabel={t("common.save")}
                  onCancel={() => setEditGoal(null)}
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button aria-label={t("common.close")} className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setDeleteConfirmId(null)} type="button" />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6">
            <p className="font-medium text-[var(--ink-strong)]">{t("goals.deleteConfirm")}</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("goals.deleteBody")}</p>
            <div className="mt-4 flex gap-2">
              <button className="action-btn flex-1 bg-[#9f1239] hover:bg-[#7f1d1d]" type="button" onClick={() => handleDeleteGoal(deleteConfirmId)}>{t("common.delete")}</button>
              <button className="tx-inline-btn flex-1" type="button" onClick={() => setDeleteConfirmId(null)}>{t("common.cancel")}</button>
            </div>
          </section>
        </div>
      )}

      <UpgradeModal
        message={upgradeMessage}
        onClose={() => setUpgradeOpen(false)}
        open={upgradeOpen}
      />
    </>
  );
}

/** Отдельная страница «Цели» (для обратной совместимости и редиректа). */
export function GoalsPageContent() {
  const { t } = useI18n();
  return (
    <AppShell
      active="goals"
      title={t("goals.title")}
      subtitle={t("goals.subtitle")}
    >
      <GoalsSection />
    </AppShell>
  );
}

type GoalFormProps = {
  name: string; setName: (v: string) => void;
  target: string; setTarget: (v: string) => void;
  current: string; setCurrent: (v: string) => void;
  date: string; setDate: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  isGated: boolean;
  submitLabel: string;
  onCancel: () => void;
};

function GoalForm({ name, setName, target, setTarget, current, setCurrent, date, setDate, currency, setCurrency, onSubmit, submitting, error, isGated, submitLabel, onCancel }: GoalFormProps) {
  const { t } = useI18n();
  function fmt(v: string) {
    const d = v.replace(/\D/g, "");
    return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 pb-2">
      {error && (
        <div className={`alert ${isGated ? "alert-info" : "alert-warn"}`}>
          {error}
          {isGated && (
            <Link className="ml-2 font-medium underline" href={ROUTES.pricing}>
              {t("upgrade.viewPlans")}
            </Link>
          )}
        </div>
      )}
      <label className="auth-field">
        <span>{t("goals.name")} <span className="text-[#9f1239]">*</span></span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("goals.namePlaceholder")} maxLength={200} required />
      </label>
      <label className="auth-field">
        <span>{t("goals.targetAmount").replace("{currency}", currency)} <span className="text-[#9f1239]">*</span></span>
        <input value={target} onChange={(e) => setTarget(fmt(e.target.value))} placeholder={t("goals.targetPlaceholder")} type="text" inputMode="numeric" autoComplete="off" required />
      </label>
      <label className="auth-field">
        <span>{t("goals.currentAmount").replace("{currency}", currency)}</span>
        <input value={current} onChange={(e) => setCurrent(fmt(e.target.value))} placeholder="0" type="text" inputMode="numeric" autoComplete="off" />
      </label>
      <label className="auth-field">
        <span>{t("goals.deadlineDate")} <span className="text-[#9f1239]">*</span></span>
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </label>
      <label className="auth-field">
        <span>{t("common.currency")}</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="KZT">KZT</option>
          <option value="USD">USD</option>
          <option value="RUB">RUB</option>
        </select>
      </label>
      <div className="sticky bottom-0 z-[1] mt-1 flex flex-col-reverse gap-2 bg-[var(--surface-1)] pt-2 pb-1 sm:flex-row sm:items-center md:static md:bg-transparent md:pt-0">
        <button className="tx-inline-btn w-full sm:w-auto" type="button" onClick={onCancel}>{t("common.cancel")}</button>
        <button className="action-btn w-full sm:flex-1" type="submit" disabled={submitting || isGated}>
          {submitting ? t("common.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}
