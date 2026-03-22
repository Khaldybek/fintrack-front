"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney, useBodyScrollLock } from "@/shared/lib";
import { AppShell } from "@/widgets/app-shell";
import {
  getBudgets,
  getCategories,
  createBudget,
  updateBudget,
  deleteBudget,
  FeatureGatedError,
} from "@/shared/api";
import type { Budget, Category } from "@/shared/api";

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

type SeverityLevel = "good" | "attention" | "risk";

function getSeverity(item: Budget): SeverityLevel {
  if (item.severity === "risk" || item.status === "risk") return "risk";
  if (item.severity === "attention" || item.status === "attention") return "attention";
  if (item.progress_percent >= 100) return "risk";
  if (item.progress_percent >= 85) return "attention";
  return "good";
}

function severityLabel(sev: SeverityLevel): string {
  if (sev === "risk") return "Перерасход";
  if (sev === "attention") return "Осторожно";
  return "В норме";
}

function severityClass(sev: SeverityLevel): string {
  if (sev === "risk") return "budget-pill risk";
  if (sev === "attention") return "budget-pill warn";
  return "budget-pill normal";
}

function barClass(sev: SeverityLevel): string {
  if (sev === "risk") return "bg-[#9f1239]";
  if (sev === "attention") return "bg-[#b45309]";
  return "bg-[#1e293b]";
}

function explanationClass(sev: SeverityLevel): string {
  if (sev === "risk") return "text-[#9f1239]";
  if (sev === "attention") return "text-[#92400e]";
  return "text-[var(--ink-soft)]";
}

/** Контент без обёртки AppShell — для встраивания на объединённую страницу «Бюджеты и цели». */
export function BudgetsSection() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formCurrency, setFormCurrency] = useState("KZT");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isGated, setIsGated] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const budgetOverlayOpen =
    modalOpen || editBudget !== null || deleteConfirmId !== null;
  useBodyScrollLock(budgetOverlayOpen);

  const loadBudgets = useCallback(() => {
    return getBudgets()
      .then(setBudgets)
      .catch((err) => setError(err?.message ?? "Не удалось загрузить бюджеты"))
      .finally(() => setLoading(false));
  }, []);

  const loadCategories = useCallback(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => { loadBudgets(); }, [loadBudgets]);
  useEffect(() => {
    if (modalOpen || editBudget) loadCategories();
  }, [modalOpen, editBudget, loadCategories]);

  const openCreateModal = () => {
    setModalOpen(true);
    setFormError(null);
    setIsGated(false);
    setFormCategoryId("");
    setFormLimit("");
    setFormCurrency("KZT");
  };

  const openEdit = (item: Budget) => {
    setEditBudget(item);
    setFormError(null);
    // limit_minor приходит в целых единицах (тенге)
    setFormLimit(formatAmountInput(String(Math.round(item.limit_minor))));
    setFormCurrency(item.currency ?? "KZT");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsGated(false);
    const limitNum = parseFloat(formLimit.replace(/\s/g, "").replace(",", "."));
    if (!formCategoryId.trim()) { setFormError("Выберите категорию"); return; }
    if (!Number.isFinite(limitNum) || limitNum <= 0) { setFormError("Введите корректный лимит"); return; }
    setSubmitting(true);
    try {
      await createBudget({
        categoryId: formCategoryId.trim(),
        limitMinor: Math.round(limitNum),
        currency: formCurrency || undefined,
      });
      await loadBudgets();
      setModalOpen(false);
    } catch (err) {
      if (err instanceof FeatureGatedError) {
        setIsGated(true);
        setFormError("Free-план позволяет только 1 бюджет. Перейдите на Pro для неограниченного количества.");
      } else {
        setFormError((err as Error)?.message ?? "Не удалось создать бюджет");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBudget) return;
    setFormError(null);
    const limitNum = parseFloat(formLimit.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(limitNum) || limitNum <= 0) { setFormError("Введите корректный лимит"); return; }
    setSubmitting(true);
    try {
      await updateBudget(editBudget.id, {
        limitMinor: Math.round(limitNum),
        currency: formCurrency || undefined,
      });
      await loadBudgets();
      setEditBudget(null);
    } catch (err) {
      setFormError((err as Error)?.message ?? "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      await loadBudgets();
      setDeleteConfirmId(null);
    } catch {
      // silent
    }
  };

  const now = new Date();
  const monthLabel = now.toLocaleString("ru-KZ", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="metric-label">Загрузка…</div>
      </section>
    );
  }

  if (error && budgets.length === 0) {
    return (
      <section className="grid grid-cols-1 gap-5">
        <div className="alert alert-warn">{error}</div>
      </section>
    );
  }

  const atRisk = budgets.filter((b) => getSeverity(b) === "risk").length;
  const atAttention = budgets.filter((b) => getSeverity(b) === "attention").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono text-xs text-[var(--ink-muted)] uppercase tracking-wide capitalize">{monthLabel}</span>
          {atRisk > 0 && (
            <span className="budget-pill risk">{atRisk} перерасход{atRisk > 1 ? "а" : ""}</span>
          )}
          {atAttention > 0 && (
            <span className="budget-pill warn">{atAttention} на грани</span>
          )}
        </div>
        <button className="action-btn" type="button" onClick={openCreateModal}>
          + Новый бюджет
        </button>
      </div>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {budgets.length === 0 ? (
          <div className="card p-5 md:p-6">
            <p className="text-sm text-[var(--ink-muted)]">
              Нет бюджетов. Нажмите «+ Новый бюджет», чтобы задать лимит по категории.
            </p>
          </div>
        ) : (
          budgets.map((item) => {
            const sev = getSeverity(item);
            const percent = item.progress_percent ?? (item.limit_minor > 0 ? Math.round((item.spent_minor / item.limit_minor) * 100) : 0);
            const categoryName = item.category?.name ?? item.categoryId;

            return (
              <article key={item.id} className="card p-5 md:p-6">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{categoryName}</h2>
                  <span className={severityClass(sev)}>
                    {severityLabel(sev)} {percent}%
                  </span>
                </div>

                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  Потрачено: <span className="font-medium text-[var(--ink-soft)]">{formatMoney(item.spent)}</span>
                  {" из "}
                  <span className="font-medium text-[var(--ink-strong)]">{formatMoney(item.limit)}</span>
                </p>

                <div className="mt-3 h-2.5 rounded-full bg-[var(--surface-3)]">
                  <div
                    className={`h-2.5 rounded-full transition-all ${barClass(sev)}`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                {item.thresholds && (
                  <div className="mt-2 flex gap-3 text-[10px] text-[var(--ink-muted)] mono">
                    <span className={item.thresholds.warning_70 ? "text-[#b45309] font-semibold" : ""}>70%</span>
                    <span className={item.thresholds.warning_85 ? "text-[#b45309] font-semibold" : ""}>85%</span>
                    <span className={item.thresholds.danger_100 ? "text-[#9f1239] font-semibold" : ""}>100%</span>
                  </div>
                )}

                {item.explanation && (
                  <p className={`mt-3 text-sm ${explanationClass(sev)}`}>{item.explanation}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="tx-inline-btn h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                    onClick={() => openEdit(item)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="tx-inline-btn danger h-9 shrink-0 rounded-lg px-3 text-sm font-medium"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    Удалить
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
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setModalOpen(false)}
            type="button"
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[480px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:max-h-[min(85dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Новый бюджет</h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setModalOpen(false)}>Закрыть</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <form onSubmit={handleCreate} className="grid gap-3 pb-2">
                  {formError && (
                    <div className={`alert ${isGated ? "alert-info" : "alert-warn"}`}>
                      {formError}
                      {isGated && (
                        <a href="/pro" className="ml-2 font-medium underline">Перейти на Pro →</a>
                      )}
                    </div>
                  )}
                  <label className="auth-field">
                    <span>Категория</span>
                    <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} required>
                      <option value="">Выберите категорию</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="auth-field">
                    <span>Лимит на месяц, {formCurrency}</span>
                    <input
                      value={formLimit}
                      onChange={(e) => setFormLimit(formatAmountInput(e.target.value))}
                      placeholder="50 000"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <label className="auth-field">
                    <span>Валюта</span>
                    <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}>
                      <option value="KZT">KZT</option>
                      <option value="USD">USD</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </label>
                  <div className="sticky bottom-0 z-[1] flex flex-col-reverse gap-2 bg-[var(--surface-1)] pt-2 pb-1 sm:flex-row sm:items-center md:static md:bg-transparent md:pt-0">
                    <button className="tx-inline-btn w-full sm:w-auto" type="button" onClick={() => setModalOpen(false)}>Отмена</button>
                    <button className="action-btn w-full sm:flex-1" type="submit" disabled={submitting || isGated}>
                      {submitting ? "Создаём…" : "Создать"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Модал редактирования */}
      {editBudget && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setEditBudget(null)}
            type="button"
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[480px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:max-h-[min(85dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    Редактировать — {editBudget.category?.name ?? editBudget.categoryId}
                  </h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setEditBudget(null)}>Закрыть</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <form onSubmit={handleEdit} className="grid gap-3 pb-2">
                  {formError && <div className="alert alert-warn">{formError}</div>}
                  <label className="auth-field">
                    <span>Лимит на месяц, {formCurrency}</span>
                    <input
                      value={formLimit}
                      onChange={(e) => setFormLimit(formatAmountInput(e.target.value))}
                      placeholder="50 000"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <label className="auth-field">
                    <span>Валюта</span>
                    <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}>
                      <option value="KZT">KZT</option>
                      <option value="USD">USD</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </label>
                  <div className="sticky bottom-0 z-[1] flex flex-col-reverse gap-2 bg-[var(--surface-1)] pt-2 pb-1 sm:flex-row sm:items-center md:static md:bg-transparent md:pt-0">
                    <button className="tx-inline-btn w-full sm:w-auto" type="button" onClick={() => setEditBudget(null)}>Отмена</button>
                    <button className="action-btn w-full sm:flex-1" type="submit" disabled={submitting}>
                      {submitting ? "Сохраняем…" : "Сохранить"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDeleteConfirmId(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6">
            <p className="font-medium text-[var(--ink-strong)]">Удалить бюджет?</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Лимит по категории будет удалён. Исторические траты не изменятся.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="action-btn flex-1 bg-[#9f1239] hover:bg-[#7f1d1d]"
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Удалить
              </button>
              <button className="tx-inline-btn flex-1" type="button" onClick={() => setDeleteConfirmId(null)}>
                Отмена
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/** Отдельная страница «Бюджеты» (для обратной совместимости и редиректа). */
export function BudgetsPageContent() {
  return (
    <AppShell
      active="budgets"
      title="Бюджеты"
      subtitle="Лимиты по категориям и контроль превышений в реальном времени."
    >
      <BudgetsSection />
    </AppShell>
  );
}
