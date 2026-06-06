"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/shared/i18n";
import { useI18n } from "@/shared/i18n";
import { formatMoney as moneyDisplay, useBodyScrollLock } from "@/shared/lib";
import { formatDateLocale, formatNumberLocale } from "@/shared/lib/format-locale";
import { AddCreditModal } from "@/features/add-credit";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import {
  getCredits,
  getCreditsSummary,
  getCreditsReminders,
  simulatePrepayment,
  updateCredit,
  deleteCredit,
} from "@/shared/api";
import type {
  Credit,
  CreditsSummaryResponse,
  CreditReminderItem,
  SimulatePrepaymentResponse,
} from "@/shared/api";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatFreedomDate(monthsFromNow: number, locale: Locale): string {
  if (monthsFromNow <= 0) return "—";
  const d = addMonths(new Date(), monthsFromNow);
  return formatDateLocale(d, locale, { month: "short", year: "numeric" });
}

function formatCountdown(monthsFromNow: number): { years: number; months: number; days: number } {
  if (monthsFromNow <= 0) return { years: 0, months: 0, days: 0 };
  const to = addMonths(new Date(), monthsFromNow);
  const from = new Date();
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) { days += 30; months--; }
  if (months < 0) { months += 12; years--; }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

/** Достаём minor из MoneyDto | number | строки */
function getMinor(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "amount_minor" in value)
    return (value as { amount_minor: number }).amount_minor;
  return 0;
}

function formatAmountInput(v: string): string {
  const d = v.replace(/\D/g, "");
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
}

type EditState = {
  id: string;
  bank: string;
  principal: string;
  ratePct: string;
  termMonths: string;
  monthlyPayment: string;
  paymentDay: string;
};

export function CreditCalculatorPageContent() {
  const { t, locale } = useI18n();
  const scenarioExtrasMinor = useMemo(
    () => [
      { label: t("credits.scenario10k"), value: 10_000 },
      { label: t("credits.scenario25k"), value: 25_000 },
      { label: t("credits.scenario50k"), value: 50_000 },
    ],
    [t],
  );
  const [credits, setCredits] = useState<Credit[]>([]);
  const [summary, setSummary] = useState<CreditsSummaryResponse | null>(null);
  const [reminders, setReminders] = useState<CreditReminderItem[]>([]);
  const [simulateCurrent, setSimulateCurrent] = useState<SimulatePrepaymentResponse | null>(null);
  const [scenarios, setScenarios] = useState<Record<number, SimulatePrepaymentResponse | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const overlayOpen = editState !== null || deleteConfirmId !== null;
  useBodyScrollLock(overlayOpen);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getCredits(),
      getCreditsSummary(),
      getCreditsReminders(14).then((r) => r.items).catch(() => []),
      simulatePrepayment({ extraPerMonthMinor: 0 }).catch(() => null),
    ])
      .then(([creditsRes, summaryRes, remindersRes, sim0]) => {
        setCredits(creditsRes ?? []);
        setSummary(summaryRes ?? null);
        setReminders(remindersRes ?? []);
        setSimulateCurrent(sim0 ?? null);
      })
      .catch((err) => setError(err?.message ?? t("credits.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (credits.length === 0) return;
    const run = async () => {
      const out: Record<number, SimulatePrepaymentResponse | null> = {};
      for (const s of scenarioExtrasMinor) {
        try { out[s.value] = await simulatePrepayment({ extraPerMonthMinor: s.value }); }
        catch { out[s.value] = null; }
      }
      setScenarios((prev) => ({ ...prev, ...out }));
    };
    run();
  }, [credits.length, scenarioExtrasMinor]);

  const openEdit = (loan: Credit) => {
    setEditError(null);
    setEditState({
      id: loan.id,
      bank: loan.bank ?? "",
      principal: formatAmountInput(String(Math.round(loan.principal_minor))),
      ratePct: String(loan.ratePct),
      termMonths: String(loan.termMonths),
      monthlyPayment: formatAmountInput(String(Math.round(loan.monthly_payment_minor))),
      paymentDay: loan.paymentDayOfMonth != null ? String(loan.paymentDayOfMonth) : "",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState) return;
    setEditError(null);
    const principalNum = parseFloat(editState.principal.replace(/\s/g, ""));
    const rateNum = parseFloat(editState.ratePct.replace(",", "."));
    const termNum = parseInt(editState.termMonths, 10);
    const monthlyNum = parseFloat(editState.monthlyPayment.replace(/\s/g, ""));
    if (!Number.isFinite(principalNum) || principalNum <= 0) { setEditError(t("credits.validatePrincipal")); return; }
    if (!Number.isFinite(rateNum) || rateNum < 0) { setEditError(t("credits.validateRate")); return; }
    if (!Number.isInteger(termNum) || termNum <= 0) { setEditError(t("credits.validateTerm")); return; }
    if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) { setEditError(t("credits.validateMonthly")); return; }
    const dayNum = editState.paymentDay.trim() ? parseInt(editState.paymentDay, 10) : undefined;
    const paymentDayOfMonth = dayNum != null && dayNum >= 1 && dayNum <= 31 ? dayNum : null;
    setEditSubmitting(true);
    try {
      await updateCredit(editState.id, {
        bank: editState.bank.trim() || null,
        principalMinor: Math.round(principalNum),
        ratePct: rateNum,
        termMonths: termNum,
        monthlyPaymentMinor: Math.round(monthlyNum),
        paymentDayOfMonth,
      });
      await load();
      setEditState(null);
    } catch (err) {
      setEditError((err as Error)?.message ?? t("credits.saveError"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCredit(id);
      await load();
      setDeleteConfirmId(null);
    } catch {
      // silent
    }
  };

  /** Грубая оценка без API — только если симуляция ещё не загрузилась */
  const totalOverpayMinorFallback = credits.reduce((acc, c) => {
    const payment = getMinor(c.monthly_payment_minor ?? c.monthlyPayment);
    const principal = getMinor(c.principal_minor ?? c.principal);
    return acc + Math.max(0, payment * c.termMonths - principal);
  }, 0);

  const currentMonths = Number(simulateCurrent?.estimated_months_to_payoff) || 0;
  const baselineMonths = Number(simulateCurrent?.baseline_months_to_payoff) || currentMonths;
  const freedomDateStr = formatFreedomDate(currentMonths, locale);
  const countdown = formatCountdown(currentMonths);

  if (loading) {
    return (
      <AppShell active="profile" title={t("credits.title")} subtitle={t("credits.subtitle")} eyebrow={t("credits.eyebrow")}>
        <ExtraScreensNav active="credits" compact />
        <section className="grid grid-cols-1 gap-5">
          <div className="metric-label">{t("common.loading")}</div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="profile" title={t("credits.title")} subtitle={t("credits.subtitle")} eyebrow={t("credits.eyebrow")}>
        <ExtraScreensNav active="credits" compact />
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        active="profile"
        title={t("credits.title")}
        subtitle={t("credits.subtitle")}
        eyebrow={t("credits.eyebrow")}
      >
        <ExtraScreensNav active="credits" compact />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">

            {/* Активные кредиты */}
            <article className="card p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{t("credits.active")}</h2>
                <AddCreditModal onSuccess={load} />
              </div>

              <div className="mt-4 space-y-3">
                {credits.length === 0 ? (
                  <p className="text-sm text-[var(--ink-muted)]">{t("credits.empty")}</p>
                ) : (
                  credits.map((loan) => {
                    const paymentMinor = getMinor(loan.monthly_payment_minor ?? loan.monthlyPayment);
                    const principalMinor = getMinor(loan.principal_minor ?? loan.principal);
                    const overpayMinor = Math.max(0, paymentMinor * loan.termMonths - principalMinor);
                    const isSoon = loan.daysUntilPayment != null && loan.daysUntilPayment <= 3;

                    return (
                      <div key={loan.id} className="credit-loan-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--ink-strong)]">
                              {loan.bank ?? t("credits.defaultName")}
                            </p>
                            <p className="mt-1 text-sm text-[var(--ink-muted)]">
                              {t("credits.amountRateTerm")
                                .replace("{amount}", moneyDisplay(loan.principal))
                                .replace("{rate}", String(loan.ratePct))
                                .replace("{term}", String(loan.termMonths))}
                            </p>
                          </div>
                          <p className="mono flex-shrink-0 text-sm font-semibold text-[var(--ink-strong)]">
                            {moneyDisplay(loan.monthlyPayment)}{t("credits.perMonth")}
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
                          {overpayMinor > 0 && (
                            <span>
                              {t("credits.overpay").replace(
                                "{amount}",
                                `${formatNumberLocale(overpayMinor, locale)} ₸`,
                              )}
                            </span>
                          )}
                          {loan.nextPaymentDate && (
                            <span className={isSoon ? "font-medium text-[#92400e]" : ""}>
                              {t("credits.paymentDate").replace("{date}", loan.nextPaymentDate)}
                              {loan.daysUntilPayment != null &&
                                t("credits.paymentInDays").replace(
                                  "{days}",
                                  String(loan.daysUntilPayment),
                                )}
                            </span>
                          )}
                          {loan.paymentDayOfMonth != null && !loan.nextPaymentDate && (
                            <span>
                              {t("credits.paymentDay").replace(
                                "{day}",
                                String(loan.paymentDayOfMonth),
                              )}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="tx-inline-btn h-8 rounded-lg px-3 text-xs"
                            onClick={() => openEdit(loan)}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            className="tx-inline-btn danger h-8 rounded-lg px-3 text-xs"
                            onClick={() => setDeleteConfirmId(loan.id)}
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            {/* Симулятор досрочного погашения */}
            {credits.length > 0 && (
              <article className="card p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {t("credits.simulator")}
                  </h2>
                  <span className="budget-pill normal">
                    {t("credits.currentPlan").replace(
                      "{amount}",
                      moneyDisplay(
                        simulateCurrent?.new_total_monthly ?? summary?.total_monthly_payment,
                      ),
                    )}
                  </span>
                </div>

                {simulateCurrent?.severity === "risk" && simulateCurrent.explanation && (
                  <div className="alert alert-warn mt-4 text-sm">
                    {simulateCurrent.explanation}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {scenarioExtrasMinor.map((s) => {
                    const res = scenarios[s.value];
                    const savedM = res?.months_saved != null ? res.months_saved : Math.max(0, baselineMonths - Number(res?.estimated_months_to_payoff || 0));
                    return (
                      <div
                        key={s.value}
                        className={`credit-scenario ${res?.severity === "risk" ? "ring-1 ring-[#fecaca]" : ""}`}
                      >
                        <p className="mono text-sm font-semibold text-[var(--ink-strong)]">
                          {t("credits.scenarioPerMonth").replace("{label}", s.label)}
                        </p>
                        {res ? (
                          <>
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">
                              {t("credits.freedomDate").replace(
                                "{date}",
                                formatFreedomDate(
                                  Number(res.estimated_months_to_payoff) || 0,
                                  locale,
                                ),
                              )}
                            </p>
                            <p className="mt-1 text-xs text-[#166534]">
                              {t("credits.fasterBy").replace("{months}", String(savedM))}
                            </p>
                            {res.interest_saved != null && (
                              <p className="mt-0.5 text-xs font-medium text-[#166534]">
                                {t("credits.interestSaved").replace(
                                  "{amount}",
                                  moneyDisplay(res.interest_saved),
                                )}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-[var(--ink-soft)]">
                              {t("credits.scenarioOverpay").replace(
                                "{amount}",
                                moneyDisplay(res.estimated_overpayment),
                              )}
                            </p>
                            {res.severity === "risk" && res.explanation && (
                              <p className="mt-1 text-xs text-[#9f1239]">{res.explanation}</p>
                            )}
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--ink-muted)]">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="metric-row">
                    <span>{t("credits.baselinePlan")}</span>
                    <span className="mono">{formatFreedomDate(baselineMonths, locale)}</span>
                  </div>
                  {scenarios[25_000] && (
                    <div className="metric-row">
                      <span>{t("credits.withExtra")}</span>
                      <span className="mono text-[#166534]">
                        {formatFreedomDate(
                          Number(scenarios[25_000]?.estimated_months_to_payoff) || 0,
                          locale,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            )}
          </div>

          <aside className="flex flex-col gap-5">
            {/* Ближайшие платежи */}
            {reminders.length > 0 && (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">{t("credits.upcoming")}</h2>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{t("credits.upcomingHint")}</p>
                <ul className="mt-4 space-y-2">
                  {reminders.map((r) => {
                    const days = r.daysUntilPayment ?? 0;
                    const isSoon = days <= 3;
                    return (
                      <li
                        key={r.id}
                        className={`rounded-lg border border-[var(--line)] p-2.5 text-sm ${isSoon ? "border-[#b45309] bg-[#fffbeb]" : ""}`}
                      >
                        <p className="font-medium text-[var(--ink-strong)]">{r.bank ?? t("credits.defaultName")}</p>
                        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                          {r.nextPaymentDate}
                          {days >= 0 &&
                            t("credits.paymentIn").replace("{days}", String(days))}
                        </p>
                        <p className="mono mt-1 text-xs font-semibold text-[var(--ink-strong)]">
                          {moneyDisplay(r.monthlyPayment ?? (r.monthly_payment_minor != null
                            ? { amount_minor: r.monthly_payment_minor, currency: r.currency ?? "KZT", formatted: "" }
                            : null))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </article>
            )}

            {/* Сводка долгов */}
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">{t("credits.summary")}</h2>
              <div className="mt-4 space-y-3">
                <div className="metric-row">
                  <span>{t("credits.totalDebt")}</span>
                  <span className="mono">{moneyDisplay(summary?.total_debt)}</span>
                </div>
                <div className="metric-row">
                  <span>{t("credits.monthlyTotal")}</span>
                  <span className="mono">{moneyDisplay(summary?.total_monthly_payment)}</span>
                </div>
                <div className="metric-row">
                  <span>{t("credits.overpayInterest")}</span>
                  <span className="mono">
                    {simulateCurrent
                      ? moneyDisplay(simulateCurrent.baseline_overpayment)
                      : totalOverpayMinorFallback > 0
                        ? `${formatNumberLocale(totalOverpayMinorFallback, locale)} ₸`
                        : "—"}
                  </span>
                </div>
                {summary?.avg_rate_pct != null && (
                  <div className="metric-row">
                    <span>{t("credits.avgRate")}</span>
                    <span className="mono">{summary.avg_rate_pct.toFixed(2)}%</span>
                  </div>
                )}
                <div className="metric-row">
                  <span>{t("credits.debtToIncome")}</span>
                  <span className="mono">
                    {summary?.debt_to_income_percent != null
                      ? `${summary.debt_to_income_percent}%`
                      : "—"}
                  </span>
                </div>
                {summary?.debt_to_income_percent == null && (
                  <p className="text-xs text-[var(--ink-muted)]">{t("credits.incomeHint")}</p>
                )}
              </div>

              <div className="credit-traffic mt-4">
                <div className={`credit-light green ${summary?.severity === "good" ? "active" : ""}`} />
                <div className={`credit-light yellow ${summary?.severity === "attention" ? "active" : ""}`} />
                <div className={`credit-light red ${summary?.severity === "risk" ? "active" : ""}`} />
              </div>
              {summary?.explanation && (
                <p className={`mt-2 text-sm ${summary.severity === "risk" ? "text-[#9f1239]" : summary.severity === "attention" ? "text-[#92400e]" : "text-[var(--ink-soft)]"}`}>
                  {summary.explanation}
                </p>
              )}
            </article>

            {/* Дата свободы */}
            {credits.length > 0 && (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">{t("credits.freedomTitle")}</h2>
                <p className="mono mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
                  {freedomDateStr}
                </p>
                {currentMonths > 0 && (
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {t("credits.monthsLeft").replace("{months}", String(currentMonths))}
                    {simulateCurrent && baselineMonths !== currentMonths && (
                      <span className="block text-xs text-[var(--ink-muted)]">
                        {t("credits.baselineMonths").replace(
                          "{months}",
                          String(baselineMonths),
                        )}
                      </span>
                    )}
                  </p>
                )}
                <div className="credit-countdown mt-4">
                  <div>
                    <p className="mono text-xl font-semibold">{countdown.years}</p>
                    <p>{t("credits.years")}</p>
                  </div>
                  <div>
                    <p className="mono text-xl font-semibold">{countdown.months}</p>
                    <p>{t("credits.months")}</p>
                  </div>
                  <div>
                    <p className="mono text-xl font-semibold">{countdown.days}</p>
                    <p>{t("credits.days")}</p>
                  </div>
                </div>
              </article>
            )}

            {/* Рекомендации */}
            {(summary?.explanation || scenarios[25_000]) && (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                  {t("credits.recommendations")}
                </h2>
                <div className="mt-4 space-y-2">
                  {summary?.explanation && <div className="alert">{summary.explanation}</div>}
                  {scenarios[25_000] && (
                    <div className="alert">
                      {t("credits.extraScenario").replace(
                        "{months}",
                        String(
                          Number(scenarios[25_000]?.estimated_months_to_payoff) || 0,
                        ),
                      )}
                      {scenarios[25_000]?.months_saved != null && (
                        <>
                          {t("credits.fasterMonths").replace(
                            "{months}",
                            String(scenarios[25_000].months_saved),
                          )}
                        </>
                      )}
                      {scenarios[25_000]?.interest_saved != null && (
                        <>
                          {t("credits.interestSavedShort").replace(
                            "{amount}",
                            moneyDisplay(scenarios[25_000].interest_saved),
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )}
          </aside>
        </section>
      </AppShell>

      {/* Модал редактирования кредита */}
      {editState && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setEditState(null)}
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
                    {t("credits.editTitle").replace(
                      "{name}",
                      editState.bank || t("credits.defaultName"),
                    )}
                  </h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setEditState(null)}>{t("common.close")}</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                <form onSubmit={handleEditSubmit} className="grid grid-cols-1 gap-4 pb-2">
                  {editError && <div className="alert alert-warn">{editError}</div>}

                  <label className="auth-field">
                    <span>{t("credits.formBank")}</span>
                    <input
                      value={editState.bank}
                      onChange={(e) => setEditState((s) => s && { ...s, bank: e.target.value })}
                      placeholder={t("credits.formBankPlaceholder")}
                      maxLength={200}
                    />
                  </label>

                  <label className="auth-field">
                    <span>{t("credits.formPrincipal")}</span>
                    <input
                      value={editState.principal}
                      onChange={(e) => setEditState((s) => s && { ...s, principal: formatAmountInput(e.target.value) })}
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
                        value={editState.ratePct}
                        onChange={(e) => setEditState((s) => s && { ...s, ratePct: e.target.value.replace(/[^\d.,]/g, "") })}
                        placeholder={t("credits.formRatePlaceholder")}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </label>
                    <label className="auth-field">
                      <span>{t("credits.formTerm")}</span>
                      <input
                        value={editState.termMonths}
                        onChange={(e) => setEditState((s) => s && { ...s, termMonths: e.target.value.replace(/\D/g, "") })}
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
                      value={editState.monthlyPayment}
                      onChange={(e) => setEditState((s) => s && { ...s, monthlyPayment: formatAmountInput(e.target.value) })}
                      placeholder={t("credits.formMonthlyPlaceholder")}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <label className="auth-field">
                    <span>{t("credits.formPaymentDay")}</span>
                    <input
                      value={editState.paymentDay}
                      onChange={(e) => setEditState((s) => s && { ...s, paymentDay: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      placeholder={t("credits.formPaymentDayPlaceholder")}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>

                  <div className="sticky bottom-0 z-[1] flex flex-col gap-2 bg-[var(--surface-1)] pt-2 pb-1 md:static md:bg-transparent md:pt-0">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                      <button className="tx-inline-btn w-full sm:w-auto" type="button" onClick={() => setEditState(null)}>{t("common.cancel")}</button>
                      <button className="action-btn w-full sm:flex-1" type="submit" disabled={editSubmitting}>
                        {editSubmitting ? t("credits.saving") : t("common.save")}
                      </button>
                    </div>
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
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDeleteConfirmId(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6">
            <p className="font-medium text-[var(--ink-strong)]">{t("credits.deleteTitle")}</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("credits.deleteHint")}</p>
            <div className="mt-4 flex gap-2">
              <button
                className="action-btn flex-1 bg-[#9f1239] hover:bg-[#7f1d1d]"
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                {t("common.delete")}
              </button>
              <button className="tx-inline-btn flex-1" type="button" onClick={() => setDeleteConfirmId(null)}>
                {t("common.cancel")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
