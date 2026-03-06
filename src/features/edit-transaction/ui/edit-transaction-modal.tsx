"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCategories,
  getAccounts,
  updateTransaction,
  suggestCategoryTransaction,
} from "@/shared/api";
import type { Transaction, Category, Account, SuggestCategoryResponse } from "@/shared/api";

export type EditTransactionModalProps = {
  transaction: Transaction;
  onSuccess?: (updated: Transaction) => void;
  onClose: () => void;
};

/** amount_minor в минорных единицах (100 = 1 ₸). В форме показываем и вводим в целых (₸). */
function signedAmountFromMinor(minor: number): { absStr: string; isExpense: boolean } {
  return {
    absStr: String(Math.round(Math.abs(minor) / 100)),
    isExpense: minor < 0,
  };
}

export function EditTransactionModal({
  transaction,
  onSuccess,
  onClose,
}: EditTransactionModalProps) {
  const { absStr: initAbs, isExpense: initIsExpense } = signedAmountFromMinor(
    transaction.amount_minor,
  );

  const [amountRaw, setAmountRaw] = useState(initAbs);
  const [isExpense, setIsExpense] = useState(initIsExpense);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [memo, setMemo] = useState(transaction.memo ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] = useState<SuggestCategoryResponse | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats ?? []);
        setAccounts(accs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const amountNum = parseFloat(amountRaw.replace(/\s/g, "").replace(",", ".")) || 0;
  const amountMinor = isExpense ? -Math.round(amountNum * 100) : Math.round(amountNum * 100);

  const canSubmit = amountMinor !== 0 && categoryId && accountId && date;

  const handleSuggestCategory = async () => {
    const memoText = memo.trim().slice(0, 500);
    if (!memoText) return;
    setSuggestError(null);
    setSuggestResult(null);
    setSuggestLoading(true);
    try {
      const res = await suggestCategoryTransaction({
        memo: memoText,
        amountMinor: amountMinor !== 0 ? amountMinor : undefined, // уже в минорах
      });
      setSuggestResult(res);
    } catch (err) {
      setSuggestError((err as Error)?.message ?? "Не удалось подсказать категорию");
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestCategory = () => {
    if (!suggestResult?.categoryId || !categories.some((c) => c.id === suggestResult.categoryId)) return;
    setCategoryId(suggestResult.categoryId);
    if (suggestResult.merchantCanonical) setMemo(suggestResult.merchantCanonical);
    setSuggestResult(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateTransaction(transaction.id, {
        accountId,
        categoryId,
        amountMinor,
        date,
        memo: memo.trim() || undefined,
      });
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setError((err as Error)?.message ?? "Не удалось обновить транзакцию");
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
            <p className="metric-label">Редактировать</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Транзакцию</h3>
          </div>
          <button className="tx-inline-btn" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>

        <div className="space-y-4">
          {/* Сумма */}
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-1">
              Сумма
            </p>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-[var(--line)] overflow-hidden">
                <button
                  className={`px-3 py-2 text-sm font-semibold transition ${
                    isExpense ? "bg-red-50 text-red-600" : "bg-white text-[var(--ink-muted)]"
                  }`}
                  onClick={() => setIsExpense(true)}
                  type="button"
                >
                  − расход
                </button>
                <button
                  className={`px-3 py-2 text-sm font-semibold transition ${
                    !isExpense ? "bg-emerald-50 text-emerald-600" : "bg-white text-[var(--ink-muted)]"
                  }`}
                  onClick={() => setIsExpense(false)}
                  type="button"
                >
                  + доход
                </button>
              </div>
              <input
                className="mono flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-right text-lg font-semibold text-[var(--ink-strong)]"
                inputMode="numeric"
                onChange={(e) => setAmountRaw(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                type="text"
                value={amountRaw}
              />
              <span className="text-sm text-[var(--ink-muted)]">₸</span>
            </div>
          </div>

          {/* Дата */}
          <label className="auth-field">
            <span>Дата</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {/* Категория */}
          {loading ? (
            <p className="text-sm text-[var(--ink-muted)]">Загрузка категорий…</p>
          ) : (
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-2">
                Категория
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-36 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      categoryId === cat.id
                        ? "border-[#0f172a] bg-[#0f172a] text-white"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]"
                    }`}
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    type="button"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Счёт */}
          {!loading && (
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-2">
                Счёт
              </p>
              <div className="grid grid-cols-2 gap-2">
                {accounts.map((acc) => (
                  <button
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      accountId === acc.id
                        ? "border-[#0f172a] bg-[#0f172a] text-white"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]"
                    }`}
                    key={acc.id}
                    onClick={() => setAccountId(acc.id)}
                    type="button"
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Комментарий */}
          <label className="auth-field">
            <span>Комментарий</span>
            <input
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Например: Yandex*Go Taxi"
              type="text"
              value={memo}
              maxLength={500}
            />
          </label>

          {/* Подсказка категории по memo (AI) */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
            <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
              Подсказка категории по описанию (AI)
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              Введите текст операции и нажмите «Подсказать» — категория и мерчант подставятся автоматически.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="action-btn shrink-0 px-4"
                onClick={handleSuggestCategory}
                disabled={suggestLoading || !memo.trim()}
              >
                {suggestLoading ? "…" : "Подсказать"}
              </button>
            </div>
            {suggestError && (
              <p className="mt-2 text-sm text-[#9f1239]">{suggestError}</p>
            )}
            {suggestResult && (
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-white p-3">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">
                  {suggestResult.categoryName}
                  {suggestResult.merchantCanonical && (
                    <span className="ml-1.5 font-normal text-[var(--ink-soft)]">
                      — {suggestResult.merchantCanonical}
                    </span>
                  )}
                </p>
                {suggestResult.confidence < 0.7 && (
                  <p className="mt-1 text-xs text-[#92400e]">Проверьте перед сохранением.</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="action-btn h-8 px-3 text-sm"
                    onClick={applySuggestCategory}
                    disabled={!suggestResult.categoryId || !categories.some((c) => c.id === suggestResult!.categoryId)}
                  >
                    Подставить
                  </button>
                  <button
                    type="button"
                    className="tx-inline-btn h-8 px-3 text-sm"
                    onClick={() => setSuggestResult(null)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-3 alert alert-warn">{error}</div>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button className="filter-chip" onClick={onClose} type="button">
            Отмена
          </button>
          <button
            className="action-btn"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </section>
    </div>
  );

  return content ? createPortal(content, document.body) : null;
}
