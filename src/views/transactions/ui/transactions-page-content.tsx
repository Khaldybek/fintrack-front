"use client";

import { useCallback, useEffect, useState } from "react";
import { AddTransactionModal } from "@/features/add-transaction";
import { EditTransactionModal } from "@/features/edit-transaction";
import { SetSplitsModal } from "@/features/set-splits";
import { ManageTemplatesModal } from "@/features/manage-templates";
import { AppShell } from "@/widgets/app-shell";
import {
  getTransactions,
  getTransactionTemplates,
  deleteTransaction,
  getCategories,
} from "@/shared/api";
import type {
  Transaction,
  TransactionTemplate,
  TransactionSplit,
} from "@/shared/api";
import type { MoneyDto } from "@/shared/api/types";

const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** Локальная дата в формате YYYY-MM-DD (без сдвига в UTC). */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(dateStr: string, today: string, yesterday: string): string {
  const d = dateStr.slice(0, 10);
  if (d === today) return "Сегодня";
  if (d === yesterday) return "Вчера";
  const [, mo, day] = d.split("-").map(Number);
  return `${day} ${MONTH_NAMES[mo - 1]}`;
}

function groupByDay(items: Transaction[], today: string, yesterday: string) {
  const groups: Record<string, Transaction[]> = {};
  for (const t of items) {
    const key = t.date.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return keys.map((key) => ({
    day: formatDayLabel(key, today, yesterday),
    dateKey: key,
    items: groups[key],
  }));
}

function formatMoneyValue(amount: MoneyDto | string, fallbackMinor?: number): string {
  if (typeof amount === "object" && amount !== null && "formatted" in amount) {
    return amount.formatted;
  }
  if (typeof amount === "string" && amount) return amount;
  if (fallbackMinor != null) {
    return `${(Math.abs(fallbackMinor) / 100).toLocaleString("ru-KZ")} ₸`;
  }
  return "—";
}

function formatTxAmount(t: Transaction): string {
  const sign = t.amount_minor >= 0 ? "+ " : "− ";
  const raw = formatMoneyValue(t.amount, t.amount_minor);
  const abs = raw.replace(/^[+\-−]\s*/, "").trim();
  return `${sign}${abs.startsWith("₸") ? abs : `₸${abs}`}`;
}

function splitPills(splits: TransactionSplit[] | undefined, totalMinor: number): string[] {
  if (!splits?.length || totalMinor === 0) return [];
  const absTotal = Math.abs(totalMinor);
  return splits.map((s) => {
    const name = s.category?.name ?? "—";
    const pct = absTotal ? Math.round((Math.abs(s.amountMinor) / absTotal) * 100) : 0;
    return `${name} ${pct}%`;
  });
}

type TypeFilter = "all" | "expense" | "income";

export function TransactionsPageContent() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const n = new Date();
    return toLocalDateString(new Date(n.getFullYear(), n.getMonth(), 1));
  });
  const [dateTo, setDateTo] = useState(() => {
    const n = new Date();
    return toLocalDateString(new Date(n.getFullYear(), n.getMonth() + 1, 0));
  });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [splittingTx, setSplittingTx] = useState<Transaction | null>(null);
  const [showManageTemplates, setShowManageTemplates] = useState(false);

  const now = new Date();
  const today = toLocalDateString(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultDateFrom = toLocalDateString(monthStart);
  const defaultDateTo = toLocalDateString(monthEnd);

  const loadTemplates = useCallback(() => {
    getTransactionTemplates()
      .then((res) => setTemplates(res ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const from = dateFrom || defaultDateFrom;
    const to = dateTo || defaultDateTo;
    Promise.all([
      getTransactions({
        dateFrom: from,
        dateTo: to,
        search: searchDebounced || undefined,
        categoryId: categoryId ?? undefined,
        limit: 200,
      }),
      getTransactionTemplates(),
      getCategories(),
    ])
      .then(([txRes, templatesRes, categoriesRes]) => {
        setItems(txRes.items);
        setTotal(txRes.total);
        setTemplates(templatesRes ?? []);
        setCategories(categoriesRes?.map((c) => ({ id: c.id, name: c.name })) ?? []);
      })
      .catch((err) => setError(err?.message ?? "Не удалось загрузить транзакции"))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, searchDebounced, categoryId, defaultDateFrom, defaultDateTo]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredByType =
    typeFilter === "all"
      ? items
      : typeFilter === "income"
        ? items.filter((t) => t.amount_minor > 0)
        : items.filter((t) => t.amount_minor < 0);

  const grouped = groupByDay(filteredByType, today, yesterdayStr);

  const monthLabel = (() => {
    const from = dateFrom || defaultDateFrom;
    const [y, m] = from.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  })();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSuccess = (updated: Transaction) => {
    setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleSplitSuccess = (updated: Transaction) => {
    setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const applyTemplate = (t: TransactionTemplate) => {
    // Open add-transaction modal pre-filling would require deeper integration;
    // for now we just invoke the regular add modal via add button
    void t;
  };

  const quickTemplates = templates.slice(0, 8);

  return (
    <AppShell
      active="transactions"
      title="Транзакции"
      subtitle="Добавление операции за 3 шага: сумма → категория → счет/комментарий."
      eyebrow="FinTrack Transactions"
      actionAs={
        <AddTransactionModal
          triggerLabel="+ Добавить"
          triggerClassName="action-btn"
          onSuccess={load}
        />
      }
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          {/* Фильтры */}
          <article className="card p-5 md:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <label className="tx-search">
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Поиск
                </span>
                <input
                  placeholder="Поиск: такси, кофе, подписка"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  С
                </span>
                <input
                  className="filter-chip cursor-pointer"
                  type="date"
                  value={dateFrom || defaultDateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  По
                </span>
                <input
                  className="filter-chip cursor-pointer"
                  type="date"
                  value={dateTo || defaultDateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>

              <select
                className="filter-chip cursor-pointer"
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
                style={{ minWidth: "140px" }}
              >
                <option value="">Категория: Все</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["all", "expense", "income"] as TypeFilter[]).map((f) => (
                <button
                  key={f}
                  className={`filter-chip ${typeFilter === f ? "active" : ""}`}
                  type="button"
                  onClick={() => setTypeFilter(f)}
                >
                  {f === "all" ? "Все" : f === "expense" ? "Расходы" : "Доходы"}
                </button>
              ))}
              <button
                className="filter-chip ml-auto"
                type="button"
                onClick={() => {
                  setDateFrom(defaultDateFrom);
                  setDateTo(defaultDateTo);
                  setSearch("");
                  setCategoryId(null);
                  setTypeFilter("all");
                }}
              >
                Сбросить · {monthLabel}
              </button>
            </div>
          </article>

          {/* Шаблоны */}
          <article className="card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                Шаблоны частых операций
              </h2>
              <button
                className="text-sm font-semibold text-[var(--ink-soft)]"
                type="button"
                onClick={() => setShowManageTemplates(true)}
              >
                Управлять
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickTemplates.length === 0 && (
                <p className="text-sm text-[var(--ink-muted)]">
                  Нет шаблонов.{" "}
                  <button
                    className="underline"
                    type="button"
                    onClick={() => setShowManageTemplates(true)}
                  >
                    Добавить
                  </button>
                </p>
              )}
              {quickTemplates.map((t) => (
                <button
                  key={t.id}
                  className="template-pill"
                  type="button"
                  onClick={() => applyTemplate(t)}
                >
                  {t.name} · {formatMoneyValue(t.amount, t.amount_minor)}
                </button>
              ))}
            </div>
          </article>

          {/* История */}
          <article className="card p-5 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                История операций
              </h2>
              <span className="mono text-xs text-[var(--ink-muted)]">
                {total} операций · по дням
              </span>
            </div>

            {loading ? (
              <div className="metric-label py-8">Загрузка…</div>
            ) : error ? (
              <div className="alert alert-warn">{error}</div>
            ) : (
              <div className="space-y-5">
                {grouped.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">
                    Нет транзакций за выбранный период.
                  </p>
                ) : (
                  grouped.map((group) => (
                    <div key={group.dateKey} className="space-y-2">
                      <p className="mono text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                        {group.day}
                      </p>

                      {group.items.map((item) => {
                        const splitLabels = splitPills(item.splits, item.amount_minor);
                        const categoryName = item.category?.name ?? "—";
                        const accountName = item.account?.name ?? "—";
                        return (
                          <div key={item.id} className="tx-row">
                            <div className="tx-row-main">
                              <div>
                                <p className="font-semibold text-[var(--ink-strong)]">
                                  {item.memo?.trim() || categoryName}
                                </p>
                                <p className="text-sm text-[var(--ink-muted)]">
                                  {categoryName} · {accountName}
                                </p>
                              </div>
                              <div className="tx-meta">
                                {splitLabels.length > 0 && (
                                  <span className="budget-pill neutral">Сплит</span>
                                )}
                              </div>
                            </div>

                            <div className="tx-inline-edit">
                              <label>
                                <span>Сумма</span>
                                <input
                                  defaultValue={formatTxAmount(item)}
                                  type="text"
                                  readOnly
                                  className={`mono ${item.amount_minor >= 0 ? "text-emerald-600" : ""}`}
                                />
                              </label>
                              <label>
                                <span>Категория</span>
                                <button
                                  className="tx-inline-btn"
                                  type="button"
                                  onClick={() => setEditingTx(item)}
                                >
                                  {categoryName}
                                </button>
                              </label>
                              <button
                                className="tx-inline-btn"
                                type="button"
                                onClick={() => setEditingTx(item)}
                              >
                                Изменить
                              </button>
                              <button
                                className="tx-inline-btn"
                                type="button"
                                onClick={() => setSplittingTx(item)}
                              >
                                Разделить
                              </button>
                              <button
                                className="tx-inline-btn danger"
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                              >
                                {deletingId === item.id ? "…" : "Удалить"}
                              </button>
                            </div>

                            {splitLabels.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {splitLabels.map((slice) => (
                                  <span key={slice} className="split-pill">
                                    {slice}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="swipe-hint">
                              Swipe влево для удаления (с подтверждением)
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </article>
        </div>

        <aside className="flex flex-col gap-5">
          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              Быстрое добавление
            </h2>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Кнопка «+ Добавить» в шапке открывает форму: сумма → категория → счёт.
            </p>
            <div className="mt-4 space-y-2">
              <button className="tx-side-btn w-full" type="button" disabled>
                Сканировать чек камерой (скоро)
              </button>
              <button className="tx-side-btn w-full" type="button" disabled>
                Голос: «1500 на такси» (скоро)
              </button>
            </div>
          </article>

          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              AI-категоризация
            </h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
              <p>Категория подставляется по счёту и истории.</p>
            </div>
          </article>
        </aside>
      </section>

      {/* Модалки */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingTx(null)}
        />
      )}
      {splittingTx && (
        <SetSplitsModal
          transaction={splittingTx}
          onSuccess={handleSplitSuccess}
          onClose={() => setSplittingTx(null)}
        />
      )}
      {showManageTemplates && (
        <ManageTemplatesModal
          onClose={() => setShowManageTemplates(false)}
          onChanged={loadTemplates}
        />
      )}
    </AppShell>
  );
}
