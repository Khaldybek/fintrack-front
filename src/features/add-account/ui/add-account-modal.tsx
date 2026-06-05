"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePlan } from "@/app/providers/plan-provider";
import { UpgradeModal } from "@/features/upgrade/ui/upgrade-modal";
import { useCanShareAccountWithHousehold } from "@/features/add-account/lib/use-can-share-account";
import { createAccount, FeatureGatedError } from "@/shared/api";
import type { Account } from "@/shared/api";
import { parseBalanceMinorInput } from "@/shared/lib";
import { isFeatureGatedError } from "@/shared/lib/is-feature-gated";
import { useI18n } from "@/shared/i18n";

export type AddAccountModalProps = {
  onSuccess?: (account: Account) => void;
  onClose: () => void;
  trigger?: React.ReactNode;
  existingAccountCount?: number;
};

const CURRENCIES = [
  { value: "KZT", label: "₸ KZT" },
  { value: "USD", label: "$ USD" },
  { value: "RUB", label: "₽ RUB" },
  { value: "EUR", label: "€ EUR" },
];

const BALANCE_HINT: Record<string, string> = {
  KZT: "Целые тенге, например 50 000",
  RUB: "Целые рубли",
  USD: "Доллары, можно с центами (100.50)",
  EUR: "Евро, можно с центами (100.50)",
};

export function AddAccountModal({
  onSuccess,
  onClose,
  existingAccountCount = 0,
}: AddAccountModalProps) {
  const { t } = useI18n();
  const { canAddAccount } = usePlan();
  const { canShare } = useCanShareAccountWithHousehold();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("KZT");
  const [balanceRaw, setBalanceRaw] = useState("");
  const [sharedWithHousehold, setSharedWithHousehold] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const canSubmit = name.trim().length > 0;
  const atLimit = !canAddAccount(existingAccountCount);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (atLimit) {
      setUpgradeMessage(
        "На Free можно добавить только 2 счёта. Оформите Pro или Family для безлимита.",
      );
      setUpgradeOpen(true);
      return;
    }
    const balanceTrimmed = balanceRaw.replace(/\s/g, "").replace(",", ".");
    const balanceMinor =
      balanceTrimmed === ""
        ? null
        : parseBalanceMinorInput(balanceRaw, currency);
    if (balanceTrimmed !== "" && balanceMinor === null) {
      setError("Введите корректный начальный баланс или оставьте поле пустым");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const account = await createAccount({
        name: name.trim(),
        currency: currency || undefined,
        ...(balanceMinor !== null ? { balanceMinor } : {}),
        ...(canShare && sharedWithHousehold ? { sharedWithHousehold: true } : {}),
      });
      onSuccess?.(account);
      onClose();
    } catch (err) {
      if (err instanceof FeatureGatedError || isFeatureGatedError(err)) {
        const hint =
          err instanceof FeatureGatedError
            ? err.upgradeHint
            : (err as { upgradeHint?: string }).upgradeHint;
        setUpgradeMessage(
          hint ??
            "На Free можно добавить только 2 счёта. Оформите Pro или Family для безлимита.",
        );
        setUpgradeOpen(true);
      } else {
        setError((err as Error)?.message ?? "Не удалось создать счёт");
      }
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
      <section className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_-12px_rgba(15,23,42,0.2)] md:my-4 md:max-h-[85vh] md:w-[420px] md:rounded-2xl md:p-6 md:pb-6 md:shadow-2xl">
        <div className="mb-1 flex justify-center md:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">Новый счёт</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              Добавить счёт
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
              placeholder="Например: Основная карта, Наличные, Накопительный"
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
          <label className="auth-field">
            <span>Начальный баланс (необязательно)</span>
            <input
              inputMode="decimal"
              onChange={(e) => setBalanceRaw(e.target.value)}
              placeholder="0"
              type="text"
              value={balanceRaw}
            />
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">
              {BALANCE_HINT[currency] ?? BALANCE_HINT.KZT}. Пустое поле — баланс
              0. Транзакция не создаётся.
            </span>
          </label>
          {canShare && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3">
              <input
                checked={sharedWithHousehold}
                className="mt-0.5"
                onChange={(e) => setSharedWithHousehold(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">
                <span className="font-medium text-[var(--ink-strong)]">
                  {t("account.sharedWithHousehold")}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                  {t("account.shareHint")}
                </span>
              </span>
            </label>
          )}
        </div>

        {atLimit ? (
          <div className="mt-3 alert alert-info">
            Достигнут лимит счетов на текущем тарифе.
          </div>
        ) : null}
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
            {submitting ? "Создание…" : "Добавить счёт"}
          </button>
        </div>
      </section>
    </div>
  );

  if (!content) return null;

  return createPortal(
    <>
      {content}
      <UpgradeModal
        message={upgradeMessage}
        onClose={() => setUpgradeOpen(false)}
        open={upgradeOpen}
      />
    </>,
    document.body,
  );
}
