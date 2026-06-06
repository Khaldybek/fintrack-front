"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccountsNav } from "@/app/(main)/accounts-nav-context";
import { AddTransactionModal } from "@/features/add-transaction";
import type { AddTransactionModalHandle } from "@/features/add-transaction";
import {
  ImportBankStatementModal,
  type ImportBankStatementModalHandle,
} from "@/features/import-bank-statement";
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
import { useI18n } from "@/shared/i18n";
import { formatNumberLocale } from "@/shared/lib/format-locale";

/** Локальная дата в формате YYYY-MM-DD (без сдвига в UTC). */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(
  dateStr: string,
  today: string,
  yesterday: string,
  t: (path: string) => string,
): string {
  const d = dateStr.slice(0, 10);
  if (d === today) return t("dates.today");
  if (d === yesterday) return t("dates.yesterday");
  const [, mo, day] = d.split("-").map(Number);
  const monthKey = String(mo).padStart(2, "0");
  return `${day} ${t(`months.${monthKey}`)}`;
}

function groupByDay(
  items: Transaction[],
  today: string,
  yesterday: string,
  t: (path: string) => string,
) {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of items) {
    const key = tx.date.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return keys.map((key) => ({
    day: formatDayLabel(key, today, yesterday, t),
    dateKey: key,
    items: groups[key],
  }));
}

function formatMoneyValue(
  amount: MoneyDto | string,
  fallbackMinor: number | undefined,
  locale: "ru" | "kk",
): string {
  if (typeof amount === "object" && amount !== null && "formatted" in amount) {
    return amount.formatted;
  }
  if (typeof amount === "string" && amount) return amount;
  if (fallbackMinor != null) {
    return `${formatNumberLocale(Math.abs(fallbackMinor), locale)} ₸`;
  }
  return "—";
}

function formatTxAmount(
  tx: Transaction,
  locale: "ru" | "kk",
): string {
  const sign = tx.amount_minor >= 0 ? "+ " : "− ";
  const raw = formatMoneyValue(tx.amount, tx.amount_minor, locale);
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
  const { t, locale } = useI18n();
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

  const addModalRef = useRef<AddTransactionModalHandle>(null);
  const importModalRef = useRef<ImportBankStatementModalHandle>(null);
  const { refresh: refreshAccountsNav } = useAccountsNav();

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
      .catch((err) => setError(err?.message ?? t("transactions.loadError")))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, searchDebounced, categoryId, defaultDateFrom, defaultDateTo, t]);

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

  const grouped = groupByDay(filteredByType, today, yesterdayStr, t);

  const monthLabel = (() => {
    const from = dateFrom || defaultDateFrom;
    const [y, m] = from.split("-").map(Number);
    return `${t(`months.${String(m).padStart(2, "0")}`)} ${y}`;
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

  const handleImportSuccess = () => {
    load();
    refreshAccountsNav();
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
      title={t("transactions.title")}
      subtitle={t("transactions.subtitle")}
      eyebrow={t("transactions.eyebrow")}
      actionAs={
        <AddTransactionModal
          ref={addModalRef}
          triggerLabel={t("transactions.addTrigger")}
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
                  {t("transactions.search")}
                </span>
                <input
                  placeholder={t("transactions.searchPlaceholder")}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {t("common.from")}
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
                  {t("common.to")}
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
                <option value="">{t("transactions.categoryAll")}</option>
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
                  {f === "all" ? t("common.all") : f === "expense" ? t("transactions.expenses") : t("transactions.income")}
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
                {t("transactions.reset").replace("{month}", monthLabel)}
              </button>
            </div>
          </article>

          {/* Шаблоны */}
          <article className="card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("transactions.templatesTitle")}
              </h2>
              <button
                className="text-sm font-semibold text-[var(--ink-soft)]"
                type="button"
                onClick={() => setShowManageTemplates(true)}
              >
                {t("transactions.manage")}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickTemplates.length === 0 && (
                <p className="text-sm text-[var(--ink-muted)]">
                  {t("transactions.noTemplates")}{" "}
                  <button
                    className="underline"
                    type="button"
                    onClick={() => setShowManageTemplates(true)}
                  >
                    {t("transactions.addButton")}
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
                  {t.name} · {formatMoneyValue(t.amount, t.amount_minor, locale)}
                </button>
              ))}
            </div>
          </article>

          {/* История */}
          <article className="card p-5 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("transactions.history")}
              </h2>
              <span className="mono text-xs text-[var(--ink-muted)]">
                {t("transactions.operationsCount").replace("{total}", String(total))}
              </span>
            </div>

            {loading ? (
              <div className="metric-label py-8">{t("common.loading")}</div>
            ) : error ? (
              <div className="alert alert-warn">{error}</div>
            ) : (
              <div className="space-y-5">
                {grouped.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">
                    {t("transactions.empty")}
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
                                  <span className="budget-pill neutral">{t("transactions.split")}</span>
                                )}
                              </div>
                            </div>

                            <div className="tx-inline-edit">
                              <label>
                                <span>{t("transactions.amount")}</span>
                                <input
                                  defaultValue={formatTxAmount(item, locale)}
                                  type="text"
                                  readOnly
                                  className={`mono ${item.amount_minor >= 0 ? "text-emerald-600" : ""}`}
                                />
                              </label>
                              <label>
                                <span>{t("transactions.add.category")}</span>
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
                                {t("common.edit")}
                              </button>
                              <button
                                className="tx-inline-btn"
                                type="button"
                                onClick={() => setSplittingTx(item)}
                              >
                                {t("transactions.splitAction")}
                              </button>
                              <button
                                className="tx-inline-btn danger"
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                              >
                                {deletingId === item.id ? "…" : t("common.delete")}
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
                              {t("transactions.swipeHint")}
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
              {t("transactions.quickAdd")}
            </h2>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {t("transactions.quickAddHint")}
            </p>
            <div className="mt-4 space-y-2">
              <button
                className="tx-side-btn w-full"
                type="button"
                onClick={() => addModalRef.current?.openWithReceipt()}
              >
                {t("transactions.scanReceipt")}
              </button>
              <button
                className="tx-side-btn w-full"
                type="button"
                onClick={() => importModalRef.current?.open()}
              >
                {t("transactions.importStatement")}
              </button>
              <p className="text-xs text-[var(--ink-muted)]">
                {t("transactions.orAddHint")}
              </p>
            </div>
          </article>

          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              {t("transactions.aiCategory")}
            </h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
              <p>{t("transactions.aiCategoryHint")}</p>
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
      <ImportBankStatementModal
        ref={importModalRef}
        onSuccess={handleImportSuccess}
      />
    </AppShell>
  );
}
