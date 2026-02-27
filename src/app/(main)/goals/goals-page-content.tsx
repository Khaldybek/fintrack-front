"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/shared/lib";
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

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function formatDeadline(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  if (!m || !y) return dateStr;
  return `${MONTH_NAMES[m - 1]} ${y}`;
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

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
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

export function GoalsPageContent() {
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

  const loadGoals = useCallback(() => {
    return getGoals()
      .then(setGoals)
      .catch((err) => setError(err?.message ?? "Не удалось загрузить цели"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const openModal = () => {
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
      setEntryError("Введите ненулевую сумму");
      return;
    }
    const amountMinor = Math.round(num * 100);
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
      setEntryError((err as Error)?.message ?? "Не удалось добавить операцию");
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
    if (!name) { setFormError("Введите название цели"); return; }
    if (!Number.isFinite(targetNum) || targetNum <= 0) { setFormError("Введите корректную целевую сумму"); return; }
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
      setFormError((err as Error)?.message ?? "Не удалось сохранить");
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
    if (!name) { setFormError("Введите название цели"); return; }
    if (!Number.isFinite(targetNum) || targetNum <= 0) { setFormError("Введите корректную целевую сумму"); return; }
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
      if (err instanceof FeatureGatedError) {
        setIsGated(true);
        setFormError("Free-план позволяет только 1 цель. Перейдите на Pro для неограниченного количества.");
      } else {
        setFormError((err as Error)?.message ?? "Не удалось создать цель");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell active="goals" title="Финансовые цели" subtitle="Мотивационная визуализация накоплений." actionLabel="+ Новая цель">
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="metric-label">Загрузка…</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="goals" title="Финансовые цели" subtitle="Мотивационная визуализация накоплений." actionLabel="+ Новая цель">
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        active="goals"
        title="Финансовые цели"
        subtitle="Мотивационная визуализация накоплений без перегруженной геймификации."
        actionLabel="+ Новая цель"
        actionAs={<button className="action-btn" type="button" onClick={openModal}>+ Новая цель</button>}
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {goals.length === 0 ? (
            <div className="card p-5 md:p-6">
              <p className="text-sm text-[var(--ink-muted)]">
                Нет целей. Создайте цель накопления, нажав «+ Новая цель».
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
                  <p className="metric-label">Срок: {formatDeadline(goal.target_date)}</p>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{goal.name}</h2>

                  <p className="mono mt-5 text-2xl font-semibold text-[var(--ink-strong)]">
                    {formatMoney(goal.current)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    из {formatMoney(goal.target)}
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
                      Пополнить / История
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                      onClick={() => openEdit(goal)}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn danger h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                      onClick={() => setDeleteConfirmId(goal.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </AppShell>

      {/* Модал создания */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80]">
          <button aria-label="Закрыть" className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setModalOpen(false)} type="button" />
          <section className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:max-h-[85vh] md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Новая цель</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setModalOpen(false)}>Закрыть</button>
            </div>
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
              submitLabel="Создать цель"
              onCancel={() => setModalOpen(false)}
            />
          </section>
        </div>
      )}

      {/* Детальный вид — история и операции */}
      {goalDetailId && (() => {
        const goal = goals.find((g) => g.id === goalDetailId);
        if (!goal) return null;
        const hasMoreEntries = entries.length < entriesTotal;
        return (
          <div className="fixed inset-0 z-[81]">
            <button aria-label="Закрыть" className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setGoalDetailId(null)} type="button" />
            <section className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:max-h-[88vh] md:w-[540px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{goal.name}</h3>
                  <p className="mono text-xs text-[var(--ink-muted)]">
                    {formatMoney(goal.current)} из {formatMoney(goal.target)} · {goal.progress_percent ?? 0}%
                  </p>
                </div>
                <button className="tx-inline-btn" type="button" onClick={() => setGoalDetailId(null)}>Закрыть</button>
              </div>

              {/* Форма операции */}
              <form onSubmit={handleAddEntry} className="grid gap-3 rounded-xl border border-[var(--line)] p-3 md:p-4">
                <p className="text-sm font-medium text-[var(--ink-strong)]">Пополнение или снятие</p>
                {entryError && <div className="alert alert-warn">{entryError}</div>}
                <label className="auth-field">
                  <span>Сумма, ₸&nbsp;<span className="text-[var(--ink-muted)]">(+ пополнение, − снятие)</span></span>
                  <input
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(formatEntryAmountInput(e.target.value))}
                    placeholder="10 000 или - 5 000"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </label>
                <label className="auth-field">
                  <span>Комментарий (необязательно)</span>
                  <input
                    value={entryComment}
                    onChange={(e) => setEntryComment(e.target.value)}
                    placeholder="До 2000 символов"
                    maxLength={2000}
                  />
                </label>
                <button className="action-btn" type="submit" disabled={entrySubmitting || !entryAmount.trim()}>
                  {entrySubmitting ? "Отправка…" : "Добавить операцию"}
                </button>
              </form>

              {/* История операций */}
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--ink-strong)]">
                    История операций
                    {entriesTotal > 0 && <span className="ml-1 mono text-xs text-[var(--ink-muted)]">({entriesTotal})</span>}
                  </p>
                </div>
                {entriesLoading && entries.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">Загрузка…</p>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">Пока нет записей.</p>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((entry) => {
                      const main = entry.amountMinor / 100;
                      const isAdd = entry.amountMinor > 0;
                      return (
                        <li key={entry.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-[var(--ink-muted)]">{formatEntryDate(entry.createdAt)}</span>
                            <span className={`mono font-semibold ${isAdd ? "text-[#166534]" : "text-[#9f1239]"}`}>
                              {isAdd ? "+" : ""}{main.toLocaleString("ru-KZ")} ₸
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
                    {entriesLoading ? "Загрузка…" : `Ещё (осталось ${entriesTotal - entries.length})`}
                  </button>
                )}
              </div>

              {/* Аналитика */}
              <div className="mt-5 rounded-xl border border-[var(--line)] p-3 md:p-4">
                <p className="text-sm font-medium text-[var(--ink-strong)]">Аналитика по цели</p>
                {analyticsLoading ? (
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">Загрузка…</p>
                ) : analytics ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[var(--ink-strong)]">{analytics.entriesCount}</p>
                        <p className="text-xs text-[var(--ink-muted)]">операций</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[#166534]">{formatMoney(analytics.totalAdded) || `${((analytics.totalAdded_minor ?? 0) / 100).toLocaleString("ru-KZ")} ₸`}</p>
                        <p className="text-xs text-[var(--ink-muted)]">пополнено</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-center">
                        <p className="mono text-base font-semibold text-[#9f1239]">{formatMoney(analytics.totalWithdrawn) || `${((analytics.totalWithdrawn_minor ?? 0) / 100).toLocaleString("ru-KZ")} ₸`}</p>
                        <p className="text-xs text-[var(--ink-muted)]">снято</p>
                      </div>
                    </div>

                    {analytics.byMonth && analytics.byMonth.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wide">По месяцам</p>
                        <ul className="space-y-1.5">
                          {analytics.byMonth.map((row) => {
                            const [y, m] = row.month.split("-").map(Number);
                            const label = m && y ? `${MONTH_NAMES[m - 1]} ${y}` : row.month;
                            const addedStr = formatMoney(row.added) || `+${((row.added_minor ?? 0) / 100).toLocaleString("ru-KZ")} ₸`;
                            const withdrawnStr = formatMoney(row.withdrawn) || `−${((row.withdrawn_minor ?? 0) / 100).toLocaleString("ru-KZ")} ₸`;
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
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">Нет данных</p>
                )}
              </div>
            </section>
          </div>
        );
      })()}

      {/* Модал редактирования */}
      {editGoal && (
        <div className="fixed inset-0 z-[80]">
          <button aria-label="Закрыть" className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setEditGoal(null)} type="button" />
          <section className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:max-h-[85vh] md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Редактировать — {editGoal.name}</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setEditGoal(null)}>Закрыть</button>
            </div>
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
              submitLabel="Сохранить"
              onCancel={() => setEditGoal(null)}
            />
          </section>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[82]">
          <button aria-label="Закрыть" className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setDeleteConfirmId(null)} type="button" />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <p className="font-medium text-[var(--ink-strong)]">Удалить цель?</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">История операций также будет удалена. Это действие нельзя отменить.</p>
            <div className="mt-4 flex gap-2">
              <button className="action-btn flex-1 bg-[#9f1239] hover:bg-[#7f1d1d]" type="button" onClick={() => handleDeleteGoal(deleteConfirmId)}>Удалить</button>
              <button className="tx-inline-btn flex-1" type="button" onClick={() => setDeleteConfirmId(null)}>Отмена</button>
            </div>
          </section>
        </div>
      )}
    </>
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
  function fmt(v: string) {
    const d = v.replace(/\D/g, "");
    return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {error && (
        <div className={`alert ${isGated ? "alert-info" : "alert-warn"}`}>
          {error}
          {isGated && <a href="/pro" className="ml-2 font-medium underline">Перейти на Pro →</a>}
        </div>
      )}
      <label className="auth-field">
        <span>Название цели <span className="text-[#9f1239]">*</span></span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Резервный фонд" maxLength={200} required />
      </label>
      <label className="auth-field">
        <span>Целевая сумма, {currency} <span className="text-[#9f1239]">*</span></span>
        <input value={target} onChange={(e) => setTarget(fmt(e.target.value))} placeholder="1 200 000" type="text" inputMode="numeric" autoComplete="off" required />
      </label>
      <label className="auth-field">
        <span>Текущее накопление, {currency} (необязательно)</span>
        <input value={current} onChange={(e) => setCurrent(fmt(e.target.value))} placeholder="0" type="text" inputMode="numeric" autoComplete="off" />
      </label>
      <label className="auth-field">
        <span>Срок (дата) <span className="text-[#9f1239]">*</span></span>
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      </label>
      <label className="auth-field">
        <span>Валюта</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="KZT">KZT</option>
          <option value="USD">USD</option>
          <option value="RUB">RUB</option>
        </select>
      </label>
      <div className="mt-1 flex gap-2">
        <button className="action-btn flex-1" type="submit" disabled={submitting || isGated}>
          {submitting ? "Сохраняем…" : submitLabel}
        </button>
        <button className="tx-inline-btn" type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
