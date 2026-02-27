"use client";

import { useState } from "react";
import { createCredit } from "@/shared/api";

export type AddCreditModalProps = {
  triggerClassName?: string;
  triggerLabel?: string;
  /** Вызывается после успешного добавления кредита (обновить список) */
  onSuccess?: () => void;
};

/** Только цифры + пробелы как разделитель тысяч */
function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function AddCreditModal({
  triggerClassName = "action-btn",
  triggerLabel = "+ Добавить кредит",
  onSuccess,
}: AddCreditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bank, setBank] = useState("");
  const [principal, setPrincipal] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = () => {
    setIsOpen(true);
    setFormError(null);
    setBank("");
    setPrincipal("");
    setRatePct("");
    setTermMonths("");
    setMonthlyPayment("");
    setPaymentDay("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const principalNum = parseFloat(principal.replace(/\s/g, "").replace(",", "."));
    const rateNum = parseFloat(ratePct.replace(",", "."));
    const termNum = parseInt(termMonths.replace(/\s/g, ""), 10);
    const monthlyNum = parseFloat(monthlyPayment.replace(/\s/g, "").replace(",", "."));

    if (!Number.isFinite(principalNum) || principalNum <= 0) {
      setFormError("Введите корректную сумму кредита");
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setFormError("Введите корректную ставку, %");
      return;
    }
    if (!Number.isInteger(termNum) || termNum <= 0) {
      setFormError("Введите срок в месяцах (целое число)");
      return;
    }
    if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) {
      setFormError("Введите ежемесячный платёж");
      return;
    }

    const principalMinor = Math.round(principalNum * 100);
    const monthlyPaymentMinor = Math.round(monthlyNum * 100);
    const dayNum = paymentDay.trim() ? parseInt(paymentDay.replace(/\D/g, ""), 10) : undefined;
    const paymentDayOfMonth =
      dayNum != null && Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 ? dayNum : undefined;

    setSubmitting(true);
    try {
      await createCredit({
        bank: bank.trim() || undefined,
        principalMinor,
        ratePct: rateNum,
        termMonths: termNum,
        monthlyPaymentMinor,
        paymentDayOfMonth: paymentDayOfMonth ?? undefined,
        currency: "KZT",
      });
      onSuccess?.();
      setIsOpen(false);
    } catch (err) {
      setFormError((err as Error)?.message ?? "Не удалось добавить кредит");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className={triggerClassName}
        onClick={openModal}
        type="button"
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[85] flex flex-col items-center justify-end md:justify-start md:pt-20">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            type="button"
          />

          <section className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[calc(100vh-6rem)] md:w-[480px] md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                Добавить кредит
              </h3>
              <button
                className="tx-inline-btn"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              {formError && (
                <div className="alert alert-warn">{formError}</div>
              )}

              <label className="auth-field">
                <span>Банк (необязательно)</span>
                <input
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Kaspi Bank"
                  type="text"
                />
              </label>

              <label className="auth-field">
                <span>Сумма кредита, ₸</span>
                <input
                  value={principal}
                  onChange={(e) => setPrincipal(formatAmountInput(e.target.value))}
                  placeholder="1 000 000"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="auth-field">
                  <span>Ставка, %</span>
                  <input
                    value={ratePct}
                    onChange={(e) => setRatePct(e.target.value.replace(/[^\d.,]/g, ""))}
                    placeholder="18.5"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </label>
                <label className="auth-field">
                  <span>Срок, мес</span>
                  <input
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value.replace(/\D/g, ""))}
                    placeholder="24"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className="auth-field">
                <span>Ежемесячный платёж, ₸</span>
                <input
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(formatAmountInput(e.target.value))}
                  placeholder="50 000"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>

              <label className="auth-field">
                <span>День платежа в месяце (1–31, необязательно)</span>
                <input
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="15"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>

              <div className="mt-2 flex gap-2">
                <button
                  className="action-btn flex-1"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Добавляем…" : "Сохранить кредит"}
                </button>
                <button
                  className="tx-inline-btn"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
