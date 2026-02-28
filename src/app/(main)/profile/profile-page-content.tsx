"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionInfoModal } from "@/shared/ui";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import { AddAccountModal, EditAccountModal } from "@/features/add-account";
import { getMe, getMePlan, getAccounts, deleteAccount } from "@/shared/api";
import type { Profile, PlanResponse, Account } from "@/shared/api";

const localeLabel: Record<string, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

export function ProfilePageContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAccounts = useCallback(() => {
    getAccounts()
      .then((list) => setAccounts(list ?? []))
      .catch(() => {});
  }, []);

  const handleDeleteAccount = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
    } catch {
      // ошибка уже показать можно через setError
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    Promise.all([getMe(), getMePlan(), getAccounts()])
      .then(([me, planData, accs]) => {
        setProfile(me);
        setPlan(planData);
        setAccounts(accs ?? []);
      })
      .catch((err) => {
        setError(err.message ?? "Не удалось загрузить профиль");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell
        active="profile"
        title="Профиль"
        subtitle="Настройки безопасности, валюты и подписки в одном месте."
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="card p-5 md:p-6">
            <div className="metric-label">Загрузка…</div>
          </article>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        active="profile"
        title="Профиль"
        subtitle="Настройки безопасности, валюты и подписки в одном месте."
      >
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  const planLabel = plan?.plan === "pro" ? "Pro" : "Free";
  const planLimits = plan?.limits;

  return (
    <AppShell
      active="profile"
      title="Профиль"
      subtitle="Настройки безопасности, валюты и подписки в одном месте."
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            Аккаунт
          </h2>
          <div className="mt-4 space-y-3">
            <div className="metric-row">
              <span>Имя</span>
              <span className="mono">
                {profile?.name ?? profile?.email ?? "—"}
              </span>
            </div>
            <div className="metric-row">
              <span>Email</span>
              <span className="mono">{profile?.email ?? "—"}</span>
            </div>
            <div className="metric-row">
              <span>Часовой пояс</span>
              <span className="mono">{profile?.timezone ?? "—"}</span>
            </div>
            <div className="metric-row">
              <span>Язык</span>
              <span className="mono">
                {profile?.locale ? localeLabel[profile.locale] ?? profile.locale : "—"}
              </span>
            </div>
          </div>
        </article>

        <article className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              Счета
            </h2>
            <button
              className="action-btn"
              type="button"
              onClick={() => setShowAddAccount(true)}
            >
              + Добавить счёт
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Счета используются при добавлении транзакций. Добавьте хотя бы один счёт, чтобы сохранять операции.
          </p>
          <div className="mt-4 space-y-2">
            {accounts.length === 0 ? (
              <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-muted)]">
                Нет счетов. Нажмите «+ Добавить счёт», чтобы создать первый (например, основная карта или наличные).
              </p>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink-strong)]">{acc.name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{acc.currency}</p>
                  </div>
                  <p className="mono shrink-0 text-sm font-semibold text-[var(--ink-strong)]">
                    {acc.balance?.formatted ?? `${(acc.balance?.amount_minor ?? 0) / 100} ${acc.currency}`}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink-strong)]"
                      onClick={() => setEditingAccount(acc)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[#9f1239] transition hover:bg-red-50 hover:text-[#7f1d1d]"
                      onClick={() => setDeleteConfirmId(acc.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            Безопасность
          </h2>
          <div className="mt-4 space-y-3">
            <div className="alert">Face ID / Touch ID: включено</div>
            <div className="alert">Двухфакторная аутентификация: активна</div>
            <div className="alert">Уведомления о входе: включены</div>
          </div>
        </article>

        <article className="card p-5 md:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                FinTrack {planLabel}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Доступ к финансовому индексу, прогнозу кассового разрыва и умным
                инсайтам.
              </p>
              {planLimits && (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  Лимиты: {planLimits.accounts} счетов, {planLimits.budgets}{" "}
                  бюджетов, {planLimits.goals} целей. Индекс:{" "}
                  {plan?.features.dashboardIndex ? "да" : "нет"}, прогноз:{" "}
                  {plan?.features.forecast ? "да" : "нет"}, семейный режим:{" "}
                  {plan?.features.familyMode ? "да" : "нет"}.
                </p>
              )}
            </div>
            <ActionInfoModal
              confirmLabel="Перейти к оплате"
              description="Управление подпиской включает смену плана, просмотр даты списания и отключение автопродления."
              items={[
                `Текущий план: ${planLabel}`,
                "Pro: ₸ 2 990 / месяц",
                "Пробный период: 7 дней",
              ]}
              title="Управление подпиской"
              triggerClassName="action-btn"
              triggerLabel="Управлять подпиской"
            />
          </div>
        </article>

        <div className="xl:col-span-2">
          <ExtraScreensNav />
        </div>
      </section>

      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onSuccess={() => loadAccounts()}
        />
      )}

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={(updated) => {
            setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setEditingAccount(null);
          }}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[82] flex flex-col items-center justify-center p-4">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setDeleteConfirmId(null)}
            type="button"
          />
          <section className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              Удалить счёт?
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {accounts.find((a) => a.id === deleteConfirmId)?.name ?? "Счёт"} будет удалён.
              Транзакции по нему останутся в истории, но привязка к счёту может измениться.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-strong)] transition hover:bg-[var(--surface-3)]"
                onClick={() => setDeleteConfirmId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-[#9f1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] disabled:opacity-60"
                onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
              >
                {deletingId === deleteConfirmId ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
