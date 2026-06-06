"use client";

import { useState } from "react";
import { createCredit } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { useBodyScrollLock } from "@/shared/lib";

export type AddCreditModalProps = {
  triggerClassName?: string;
  triggerLabel?: string;
  onSuccess?: () => void;
};

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function AddCreditModal({
  triggerClassName = "action-btn",
  triggerLabel,
  onSuccess,
}: AddCreditModalProps) {
  const { t } = useI18n();
  const resolvedTriggerLabel = triggerLabel ?? t("credits.add");
  const [isOpen, setIsOpen] = useState(false);
  const [bank, setBank] = useState("");
  const [principal, setPrincipal] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

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
      setFormError(t("credits.validatePrincipal"));
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setFormError(t("credits.validateRatePct"));
      return;
    }
    if (!Number.isInteger(termNum) || termNum <= 0) {
      setFormError(t("credits.validateTermInt"));
      return;
    }
    if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) {
      setFormError(t("credits.validateMonthly"));
      return;
    }

    const principalMinor = Math.round(principalNum);
    const monthlyPaymentMinor = Math.round(monthlyNum);
    const dayNum = paymentDay.trim()
      ? parseInt(paymentDay.replace(/\D/g, ""), 10)
      : undefined;
    const paymentDayOfMonth =
      dayNum != null && Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31
        ? dayNum
        : undefined;

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
      setFormError((err as Error)?.message ?? t("credits.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button className={triggerClassName} onClick={openModal} type="button">
        {resolvedTriggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[85] overflow-hidden">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            type="button"
          />

          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-start md:justify-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[480px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:mt-0 md:max-h-[min(85dvh,calc(100dvh-4rem))] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {t("credits.addTitle")}
                  </h3>
                  <button
                    className="tx-inline-btn"
                    onClick={() => setIsOpen(false)}
                    type="button"
                  >
                    {t("common.close")}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 pb-2">
                  {formError && <div className="alert alert-warn">{formError}</div>}

                  <label className="auth-field">
                    <span>{t("credits.formBank")}</span>
                    <input
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      placeholder={t("credits.formBankPlaceholder")}
                      type="text"
                    />
                  </label>

                  <label className="auth-field">
                    <span>{t("credits.formPrincipal")}</span>
                    <input
                      value={principal}
                      onChange={(e) => setPrincipal(formatAmountInput(e.target.value))}
                      placeholder={t("credits.formPrincipalPlaceholder")}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="auth-field">
                      <span>{t("credits.formRate")}</span>
                      <input
                        value={ratePct}
                        onChange={(e) =>
                          setRatePct(e.target.value.replace(/[^\d.,]/g, ""))
                        }
                        placeholder={t("credits.formRatePlaceholder")}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </label>
                    <label className="auth-field">
                      <span>{t("credits.formTerm")}</span>
                      <input
                        value={termMonths}
                        onChange={(e) =>
                          setTermMonths(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder={t("credits.formTermPlaceholder")}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <label className="auth-field">
                    <span>{t("credits.formMonthly")}</span>
                    <input
                      value={monthlyPayment}
                      onChange={(e) =>
                        setMonthlyPayment(formatAmountInput(e.target.value))
                      }
                      placeholder={t("credits.formMonthlyPlaceholder")}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <label className="auth-field">
                    <span>{t("credits.formPaymentDayFull")}</span>
                    <input
                      value={paymentDay}
                      onChange={(e) =>
                        setPaymentDay(e.target.value.replace(/\D/g, "").slice(0, 2))
                      }
                      placeholder={t("credits.formPaymentDayPlaceholder")}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <div className="sticky bottom-0 z-[1] flex flex-col gap-2 bg-[var(--surface-1)] pt-2 pb-1 md:static md:bg-transparent md:pt-0">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                      <button
                        className="tx-inline-btn w-full sm:w-auto sm:flex-initial"
                        type="button"
                        onClick={() => setIsOpen(false)}
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        className="action-btn w-full sm:flex-1"
                        type="submit"
                        disabled={submitting}
                      >
                        {submitting ? t("credits.adding") : t("credits.saveCredit")}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
