"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCategories,
  getAccounts,
  createTransaction,
} from "@/shared/api";
import type { Category, Account } from "@/shared/api";

export type AddTransactionModalProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
};

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

/** Только цифры + пробелы как разделитель тысяч при отображении */
function formatAmountDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function AddTransactionModal({
  triggerLabel = "+ Транзакция",
  triggerClassName = "fab-add",
  onSuccess,
}: AddTransactionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setFormError(null);
    Promise.all([getCategories(), getAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats ?? []);
        setAccounts(accs ?? []);
        setCategoryId((prev) => (prev ?? cats?.[0]?.id ?? null));
        setAccountId((prev) => (prev ?? accs?.[0]?.id ?? null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    setStep(1);
    setAmountRaw("");
    setComment("");
    setFormError(null);
  };

  const openModal = () => {
    setIsOpen(true);
    setStep(1);
  };

  const onKeypad = (key: string) => {
    if (key === "⌫") {
      setAmountRaw((prev) => prev.replace(/\D/g, "").slice(0, -1));
      return;
    }
    if (key === ".") {
      setAmountRaw((prev) => (prev.includes(".") ? prev : `${prev}.`));
      return;
    }
    setAmountRaw((prev) => (prev === "0" && key !== "." ? key : `${prev}${key}`));
  };

  const amountDisplay = formatAmountDisplay(amountRaw || "0");
  const amountNum = parseFloat((amountRaw || "0").replace(/\s/g, "").replace(",", "."));
  const canSubmit = Number.isFinite(amountNum) && amountNum > 0 && categoryId && accountId;

  const handleSubmit = async () => {
    if (!canSubmit || !categoryId || !accountId) return;
    const amountMinor = -Math.round(amountNum * 100);
    const date = new Date().toISOString().slice(0, 10);
    setSubmitting(true);
    setFormError(null);
    try {
      await createTransaction({
        accountId,
        categoryId,
        amountMinor,
        date,
        memo: comment.trim() || undefined,
      });
      onSuccess?.();
      closeModal();
    } catch (err) {
      setFormError((err as Error)?.message ?? "Не удалось сохранить транзакцию");
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = isOpen && typeof document !== "undefined" && (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label="Закрыть модалку"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={closeModal}
        type="button"
      />

      <section className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[620px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">Добавить транзакцию</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              3 шага: сумма → категория → счёт
            </h3>
          </div>
          <button
            className="tx-inline-btn"
            onClick={closeModal}
            type="button"
          >
            Закрыть
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((current) => (
            <button
              className={`tx-step ${step === current ? "active" : ""}`}
              key={current}
              onClick={() => setStep(current)}
              type="button"
            >
              <span>{current}</span>
              {current === 1 ? "Сумма" : current === 2 ? "Категория" : "Счёт"}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="mono text-xs text-[var(--ink-muted)]">Сумма (расход)</p>
              <p className="mono mt-1 text-3xl font-semibold text-[var(--ink-strong)]">
                {amountDisplay} ₸
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {keypad.map((key) => (
                <button
                  className="rounded-xl border border-[var(--line)] bg-white py-3 text-sm font-semibold text-[var(--ink-strong)]"
                  key={key}
                  onClick={() => onKeypad(key)}
                  type="button"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-sm text-[var(--ink-muted)]">Загрузка категорий…</p>
            ) : (
              categories.map((cat) => (
                <button
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
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
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {loading ? (
                <p className="text-sm text-[var(--ink-muted)]">Загрузка счетов…</p>
              ) : (
                accounts.map((acc) => (
                  <button
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
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
                ))
              )}
            </div>
            <label className="auth-field">
              <span>Комментарий (необязательно)</span>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: поездка на встречу"
                type="text"
              />
            </label>
          </div>
        )}

        {formError && (
          <div className="mt-3 alert alert-warn">{formError}</div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            className="filter-chip"
            disabled={step === 1}
            onClick={() => setStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev))}
            type="button"
          >
            Назад
          </button>
          {step < 3 ? (
            <button
              className="action-btn"
              onClick={() => setStep((prev) => (prev < 3 ? (prev + 1) as 1 | 2 | 3 : prev))}
              type="button"
            >
              Далее
            </button>
          ) : (
            <button
              className="action-btn"
              onClick={handleSubmit}
              type="button"
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Сохранение…" : "Сохранить"}
            </button>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button className={triggerClassName} onClick={openModal} type="button">
        {triggerLabel}
      </button>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
