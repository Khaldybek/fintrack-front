"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/shared/lib";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  getSubscriptionsSummary,
  getSubscriptionsReminders,
  paySubscription,
  deleteSubscription,
  getCategories,
} from "@/shared/api";
import type {
  Subscription,
  SubscriptionReminder,
  SubscriptionsSummaryResponse,
  Category,
} from "@/shared/api";

const MONTH_NAMES = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatNextPayment(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function monthlyEquivalentMinor(sub: Subscription): number {
  if (sub.intervalDays <= 0) return sub.amount_minor;
  return Math.round((sub.amount_minor * 30) / sub.intervalDays);
}

function statusLabel(status: string, days: number): string {
  if (status === "overdue" || days < 0) return "Просрочена";
  if (status === "soon" || days <= 3) return `Через ${days} дн.`;
  return "Активна";
}

function pillClass(status: string, days: number): string {
  if (status === "overdue" || days < 0) return "budget-pill risk";
  if (status === "soon" || days <= 3) return "budget-pill warn";
  return "budget-pill normal";
}

function formatAmountInput(v: string): string {
  const d = v.replace(/\D/g, "");
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
}

type FormState = {
  name: string;
  amount: string;
  currency: string;
  nextPaymentDate: string;
  intervalDays: string;
  categoryId: string;
};

const emptyForm = (): FormState => ({
  name: "", amount: "", currency: "KZT",
  nextPaymentDate: "", intervalDays: "30", categoryId: "",
});

export function SubscriptionsPageContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<SubscriptionsSummaryResponse | null>(null);
  const [reminders, setReminders] = useState<SubscriptionReminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([
      getSubscriptions(),
      getSubscriptionsSummary().catch(() => null),
      getSubscriptionsReminders(14).catch(() => []),
    ])
      .then(([subs, sum, rem]) => {
        setSubscriptions(subs ?? []);
        setSummary(sum);
        setReminders(Array.isArray(rem) ? rem : []);
      })
      .catch((err) => setError(err?.message ?? "Не удалось загрузить подписки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (modalOpen || editSub) {
      getCategories().then(setCategories).catch(() => {});
    }
  }, [modalOpen, editSub]);

  const openCreate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm({ ...emptyForm(), nextPaymentDate: tomorrow.toISOString().slice(0, 10) });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditSub(sub);
    setFormError(null);
    setForm({
      name: sub.name,
      amount: formatAmountInput(String(Math.round(sub.amount_minor))),
      currency: sub.currency ?? "KZT",
      nextPaymentDate: sub.nextPaymentDate?.slice(0, 10) ?? "",
      intervalDays: String(sub.intervalDays),
      categoryId: sub.categoryId,
    });
  };

  const setField = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Введите название подписки";
    const amt = parseFloat(form.amount.replace(/\s/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return "Введите корректную сумму";
    if (!form.nextPaymentDate) return "Укажите дату следующего платежа";
    const interval = parseInt(form.intervalDays, 10);
    if (!Number.isInteger(interval) || interval < 1) return "Интервал должен быть ≥ 1 дня";
    if (!form.categoryId) return "Выберите категорию";
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      await createSubscription({
        name: form.name.trim(),
        amountMinor: Math.round(parseFloat(form.amount.replace(/\s/g, ""))),
        currency: form.currency || undefined,
        nextPaymentDate: form.nextPaymentDate,
        intervalDays: parseInt(form.intervalDays, 10),
        categoryId: form.categoryId,
      });
      await load();
      setModalOpen(false);
    } catch (err) {
      setFormError((err as Error)?.message ?? "Не удалось создать подписку");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSub) return;
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      await updateSubscription(editSub.id, {
        name: form.name.trim(),
        amountMinor: Math.round(parseFloat(form.amount.replace(/\s/g, ""))),
        currency: form.currency || undefined,
        nextPaymentDate: form.nextPaymentDate,
        intervalDays: parseInt(form.intervalDays, 10),
        categoryId: form.categoryId,
      });
      await load();
      setEditSub(null);
    } catch (err) {
      setFormError((err as Error)?.message ?? "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  const totalMonthlyMinor = subscriptions.reduce((acc, s) => acc + monthlyEquivalentMinor(s), 0);
  const upcomingSoon = subscriptions.filter((s) => daysUntil(s.nextPaymentDate) <= 3 && daysUntil(s.nextPaymentDate) >= 0);
  const overdue = subscriptions.filter((s) => s.status === "overdue" || daysUntil(s.nextPaymentDate) < 0);

  const estimatedMonthlyDisplay =
    summary != null
      ? formatMoney(summary.estimated_monthly_total) ||
        `${summary.estimated_monthly_total_minor.toLocaleString("ru-KZ")} ${summary.currency}`
      : totalMonthlyMinor > 0
        ? `${totalMonthlyMinor.toLocaleString("ru-KZ")} ₸`
        : "—";

  const handlePay = async (id: string) => {
    setPayingId(id);
    try {
      await paySubscription(id);
      await load();
    } catch {
      // silent
    } finally {
      setPayingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSubscription(id);
      setEditSub(null);
      await load();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <AppShell active="profile" title="Подписки и автосписания" subtitle="Контроль регулярных платежей и точек автоматической нагрузки.">
        <ExtraScreensNav active="subscriptions" compact />
        <div className="mt-4 metric-label">Загрузка…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="profile" title="Подписки и автосписания" subtitle="Контроль регулярных платежей и точек автоматической нагрузки.">
        <ExtraScreensNav active="subscriptions" compact />
        <div className="mt-4 alert alert-warn">{error}</div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        active="profile"
        title="Подписки и автосписания"
        subtitle="Контроль регулярных платежей и точек автоматической нагрузки."
        actionAs={
          <button className="action-btn" type="button" onClick={openCreate}>
            + Добавить подписку
          </button>
        }
      >
        <ExtraScreensNav active="subscriptions" compact />

        <section className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
          {/* Список подписок */}
          <article className="card p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Активные списания</h2>
              {subscriptions.length > 0 && (
                <span className="mono text-xs text-[var(--ink-muted)]">
                  {summary?.subscriptions_count ?? subscriptions.length} подписок
                </span>
              )}
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Нет подписок. Нажмите «+ Добавить подписку» для учёта регулярных списаний.
              </p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((item) => {
                  const days = daysUntil(item.nextPaymentDate);
                  const monthlyMinor = monthlyEquivalentMinor(item);
                  const monthlyStr = `${monthlyMinor.toLocaleString("ru-KZ")} ₸/мес`;

                  return (
                    <div key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[var(--ink-strong)]">{item.name}</p>
                            {item.category?.name && (
                              <span className="mono text-xs text-[var(--ink-muted)] bg-[var(--surface-3)] rounded-md px-1.5 py-0.5">
                                {item.category.name}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-muted)]">
                            <span>Следующий: {formatNextPayment(item.nextPaymentDate)}</span>
                            <span>Каждые {item.intervalDays} дн.</span>
                            {monthlyMinor !== item.amount_minor && (
                              <span>≈ {monthlyStr}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span className="mono text-sm font-semibold text-[var(--ink-strong)]">
                            {formatMoney(item.amount)}
                          </span>
                          <span className={pillClass(item.status, days)}>
                            {statusLabel(item.status, days)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="tx-inline-btn h-7 rounded-lg px-2.5 text-xs"
                          onClick={() => openEdit(item)}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          className="tx-inline-btn h-7 rounded-lg px-2.5 text-xs text-[#166534]"
                          disabled={payingId === item.id || deletingId === item.id}
                          onClick={() => handlePay(item.id)}
                        >
                          {payingId === item.id ? "…" : "Оплатил"}
                        </button>
                        <button
                          type="button"
                          className="tx-inline-btn danger h-7 rounded-lg px-2.5 text-xs"
                          disabled={deletingId === item.id || payingId === item.id}
                          onClick={() => {
                            if (typeof window !== "undefined" && !window.confirm(`Удалить «${item.name}»?`)) return;
                            handleDelete(item.id);
                          }}
                        >
                          {deletingId === item.id ? "…" : "Удалить"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          {/* Сайдбар */}
          <aside className="flex flex-col gap-5">
            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">Сводка</h2>
              <div className="mt-4 space-y-3">
                <div className="metric-row">
                  <span>Всего подписок</span>
                  <span className="mono">{summary?.subscriptions_count ?? subscriptions.length}</span>
                </div>
                <div className="metric-row">
                  <span>Оценка в месяц</span>
                  <span className="mono">{estimatedMonthlyDisplay}</span>
                </div>
                {(summary?.due_soon_count ?? 0) > 0 && (
                  <div className="metric-row">
                    <span>Скоро к оплате (14 дн.)</span>
                    <span className="mono text-[#b45309]">{summary?.due_soon_count}</span>
                  </div>
                )}
                {overdue.length > 0 && (
                  <div className="metric-row">
                    <span>Просрочено</span>
                    <span className="mono text-[#9f1239]">{overdue.length}</span>
                  </div>
                )}
                {!summary && upcomingSoon.length > 0 && (
                  <div className="metric-row">
                    <span>Спишется в ближайшие 3 дня</span>
                    <span className="mono text-[#b45309]">{upcomingSoon.length}</span>
                  </div>
                )}
              </div>
            </article>

            {/* Напоминания с бэкенда (GET /subscriptions/reminders) */}
            {reminders.length > 0 ? (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">Ближайшие платежи</h2>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">До 14 дней</p>
                <ul className="mt-3 space-y-2">
                  {reminders.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--ink-strong)]">{s.name}</span>
                        <span className="mono text-xs text-[var(--ink-muted)]">
                          {s.days_until_payment < 0
                            ? `просрочено ${Math.abs(s.days_until_payment)} дн.`
                            : s.days_until_payment === 0
                              ? "сегодня"
                              : `через ${s.days_until_payment} дн.`}
                        </span>
                      </div>
                      <span className="mono text-xs text-[var(--ink-soft)]">
                        {formatNextPayment(s.nextPaymentDate)} · {formatMoney(s.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : upcomingSoon.length > 0 ? (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">Ближайшие списания</h2>
                <ul className="mt-3 space-y-2">
                  {upcomingSoon.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#b45309]/30 bg-[#fffbeb] px-3 py-2 text-sm">
                      <span className="font-medium text-[var(--ink-strong)]">{s.name}</span>
                      <span className="mono text-xs font-semibold text-[#b45309]">
                        {formatNextPayment(s.nextPaymentDate)} · {formatMoney(s.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}

            <article className="card p-5">
              <h2 className="text-base font-semibold text-[var(--ink-strong)]">Инсайт</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                {overdue.length > 0
                  ? `${overdue.length} подписок просрочено. Обновите дату следующего платежа.`
                  : upcomingSoon.length > 0
                    ? "Часть подписок спишется в ближайшие 3 дня. Проверьте баланс счёта."
                    : subscriptions.length > 0
                      ? "Регулярные списания под контролем. Пауза неиспользуемых подписок освободит бюджет."
                      : "Добавьте подписки, чтобы видеть сводку и даты списаний."}
              </p>
            </article>
          </aside>
        </section>
      </AppShell>

      {/* Модал создания */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setModalOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Добавить подписку</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setModalOpen(false)}>Закрыть</button>
            </div>
            <SubscriptionForm
              form={form}
              setField={setField}
              categories={categories}
              onSubmit={handleCreate}
              submitting={submitting}
              error={formError}
              submitLabel="Добавить"
              onCancel={() => setModalOpen(false)}
            />
          </section>
        </div>
      )}

      {/* Модал редактирования */}
      {editSub && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setEditSub(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Редактировать — {editSub.name}</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setEditSub(null)}>Закрыть</button>
            </div>
            <SubscriptionForm
              form={form}
              setField={setField}
              categories={categories}
              onSubmit={handleEdit}
              submitting={submitting}
              error={formError}
              submitLabel="Сохранить"
              onCancel={() => setEditSub(null)}
            />
            <button
              type="button"
              className="tx-inline-btn danger mt-4 w-full"
              disabled={deletingId === editSub.id || submitting}
              onClick={() => {
                if (!editSub) return;
                if (typeof window !== "undefined" && !window.confirm(`Удалить подписку «${editSub.name}»?`)) return;
                handleDelete(editSub.id);
              }}
            >
              {deletingId === editSub.id ? "Удаляем…" : "Удалить подписку"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

type SubscriptionFormProps = {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, v: FormState[K]) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onCancel: () => void;
};

function SubscriptionForm({
  form, setField, categories, onSubmit, submitting, error, submitLabel, onCancel,
}: SubscriptionFormProps) {
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {error && <div className="alert alert-warn">{error}</div>}

      <label className="auth-field">
        <span>Название <span className="text-[#9f1239]">*</span></span>
        <input
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Netflix, Kaspi Gold…"
          maxLength={255}
          required
          autoComplete="off"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="auth-field">
          <span>Сумма, {form.currency} <span className="text-[#9f1239]">*</span></span>
          <input
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " "))}
            placeholder="2 990"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </label>
        <label className="auth-field">
          <span>Валюта</span>
          <select value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
            <option value="KZT">KZT</option>
            <option value="USD">USD</option>
            <option value="RUB">RUB</option>
          </select>
        </label>
      </div>

      <label className="auth-field">
        <span>Дата следующего платежа <span className="text-[#9f1239]">*</span></span>
        <input
          value={form.nextPaymentDate}
          onChange={(e) => setField("nextPaymentDate", e.target.value)}
          type="date"
          required
        />
      </label>

      <label className="auth-field">
        <span>Интервал (дней) <span className="text-[#9f1239]">*</span></span>
        <input
          value={form.intervalDays}
          onChange={(e) => setField("intervalDays", e.target.value.replace(/\D/g, ""))}
          placeholder="30"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
        />
      </label>

      <label className="auth-field">
        <span>Категория расходов <span className="text-[#9f1239]">*</span></span>
        <select
          value={form.categoryId}
          onChange={(e) => setField("categoryId", e.target.value)}
          required
        >
          <option value="">Выберите категорию</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <div className="mt-1 flex gap-2">
        <button className="action-btn flex-1" type="submit" disabled={submitting}>
          {submitting ? "Сохраняем…" : submitLabel}
        </button>
        <button className="tx-inline-btn" type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
