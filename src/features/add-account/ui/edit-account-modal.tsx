"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateAccount } from "@/shared/api";
import type { Account } from "@/shared/api";

export type EditAccountModalProps = {
  account: Account;
  onSuccess?: (account: Account) => void;
  onClose: () => void;
};

const CURRENCIES = [
  { value: "KZT", label: "₸ KZT" },
  { value: "USD", label: "$ USD" },
  { value: "RUB", label: "₽ RUB" },
  { value: "EUR", label: "€ EUR" },
];

export function EditAccountModal({
  account,
  onSuccess,
  onClose,
}: EditAccountModalProps) {
  const [name, setName] = useState(account.name);
  const [currency, setCurrency] = useState(account.currency || "KZT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(account.name);
    setCurrency(account.currency || "KZT");
  }, [account.id, account.name, account.currency]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateAccount(account.id, {
        name: name.trim(),
        currency: currency || undefined,
      });
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setError((err as Error)?.message ?? "Не удалось сохранить");
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
      <section className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[420px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">Редактирование</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              Счёт: {account.name}
            </h3>
          </div>
          <button className="tx-inline-btn" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>

        <div className="space-y-4">
          <label className="auth-field">
            <span>Название счёта</span>
            <input
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Основная карта, Наличные…"
              type="text"
              value={name}
            />
          </label>
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-1">
              Валюта
            </p>
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-strong)]"
              onChange={(e) => setCurrency(e.target.value)}
              value={currency}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Баланс при редактировании не меняется.
          </p>
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
