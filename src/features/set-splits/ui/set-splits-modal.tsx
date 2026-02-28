"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getCategories, createTransactionSplits } from "@/shared/api";
import type { Transaction, Category } from "@/shared/api";

export type SetSplitsModalProps = {
  transaction: Transaction;
  onSuccess?: (updated: Transaction) => void;
  onClose: () => void;
};

interface SplitRow {
  id: string;
  categoryId: string;
  amountRaw: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function SetSplitsModal({ transaction, onSuccess, onClose }: SetSplitsModalProps) {
  const totalAbs = Math.abs(transaction.amount_minor);

  const initialRows: SplitRow[] = transaction.splits?.length
    ? transaction.splits.map((s) => ({
        id: uid(),
        categoryId: s.categoryId,
        amountRaw: String(Math.abs(s.amountMinor)),
      }))
    : [
        { id: uid(), categoryId: transaction.categoryId, amountRaw: String(totalAbs) },
        { id: uid(), categoryId: transaction.categoryId, amountRaw: "" },
      ];

  const [rows, setRows] = useState<SplitRow[]>(initialRows);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: uid(), categoryId: transaction.categoryId, amountRaw: "" },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const updateRow = (id: string, field: keyof Omit<SplitRow, "id">, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const sumMinor = rows.reduce((acc, r) => acc + (parseInt(r.amountRaw, 10) || 0), 0);
  const diff = totalAbs - sumMinor;
  const isBalanced = diff === 0;

  const handleSubmit = async () => {
    if (!isBalanced) {
      setError(`Сумма разбивки (${sumMinor}) не равна сумме транзакции (${totalAbs}).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const splits = rows.map((r) => ({
        categoryId: r.categoryId,
        amountMinor:
          transaction.amount_minor < 0
            ? -(parseInt(r.amountRaw, 10) || 0)
            : parseInt(r.amountRaw, 10) || 0,
      }));
      const updated = await createTransactionSplits(transaction.id, { splits });
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setError((err as Error)?.message ?? "Не удалось сохранить разбивку");
    } finally {
      setSubmitting(false);
    }
  };

  const content = typeof document !== "undefined" && (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <section className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[520px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">Разбивка по категориям</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              Итого: {totalAbs.toLocaleString("ru-KZ")} ₸
            </h3>
          </div>
          <button className="tx-inline-btn" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--ink-muted)]">Загрузка категорий…</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-2">
                <span className="mono text-xs text-[var(--ink-muted)] w-4 shrink-0">
                  {idx + 1}
                </span>
                <select
                  className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-strong)]"
                  onChange={(e) => updateRow(row.id, "categoryId", e.target.value)}
                  value={row.categoryId}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="mono w-28 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-right text-sm font-semibold text-[var(--ink-strong)]"
                  inputMode="numeric"
                  onChange={(e) =>
                    updateRow(row.id, "amountRaw", e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  value={row.amountRaw}
                />
                <span className="text-xs text-[var(--ink-muted)]">₸</span>
                <button
                  className="tx-inline-btn danger shrink-0"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(row.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              className="filter-chip mt-1"
              onClick={addRow}
              type="button"
            >
              + Добавить строку
            </button>

            <div
              className={`rounded-xl p-3 text-sm font-semibold ${
                isBalanced
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isBalanced
                ? "Сумма сходится ✓"
                : `Остаток: ${diff > 0 ? "+" : ""}${diff.toLocaleString("ru-KZ")} ₸`}
            </div>
          </div>
        )}

        {error && <div className="mt-3 alert alert-warn">{error}</div>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button className="filter-chip" onClick={onClose} type="button">
            Отмена
          </button>
          <button
            className="action-btn"
            disabled={!isBalanced || submitting || loading}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? "Сохранение…" : "Сохранить разбивку"}
          </button>
        </div>
      </section>
    </div>
  );

  return content ? createPortal(content, document.body) : null;
}
