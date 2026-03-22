"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers/auth-provider";
import { ActionInfoModal } from "@/shared/ui";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import { AccountCard, AddAccountModal, EditAccountModal } from "@/features/add-account";
import { getMe, getMePlan, getAccounts, deleteAccount } from "@/shared/api";
import type { Profile, PlanResponse, Account } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";

const localeLabel: Record<string, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

export function ProfilePageContent() {
  const { t, locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
        setError(err.message ?? t("profile.loadError"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  if (loading) {
    return (
      <AppShell
        active="profile"
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="card p-5 md:p-6">
            <div className="metric-label">{t("common.loading")}</div>
          </article>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        active="profile"
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
      >
        <section className="grid grid-cols-1 gap-5">
          <div className="alert alert-warn">{error}</div>
        </section>
      </AppShell>
    );
  }

  const planLabel = plan?.plan === "pro" ? "Pro" : "Free";
  const planLimits = plan?.limits;

  const planLimitsText =
    planLimits && plan
      ? t("profile.planLimits")
          .replace("{accounts}", String(planLimits.accounts))
          .replace("{budgets}", String(planLimits.budgets))
          .replace("{goals}", String(planLimits.goals))
          .replace("{index}", plan.features.dashboardIndex ? t("common.yes") : t("common.no"))
          .replace("{forecast}", plan.features.forecast ? t("common.yes") : t("common.no"))
          .replace("{family}", plan.features.familyMode ? t("common.yes") : t("common.no"))
      : null;

  return (
    <AppShell
      active="profile"
      title={t("profile.title")}
      subtitle={t("profile.subtitle")}
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="xl:col-span-2 flex justify-end">
          <button
            type="button"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--surface-3)] hover:text-[var(--ink-strong)] disabled:opacity-60"
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } finally {
                setLoggingOut(false);
              }
            }}
            disabled={loggingOut}
          >
            {loggingOut ? t("profile.loggingOut") : t("profile.logout")}
          </button>
        </div>

        <article className="card p-5 md:p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            {t("profile.interface.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{t("profile.interface.hint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                locale === "ru"
                  ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-strong)] ring-2 ring-[var(--accent)]/40"
                  : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[var(--surface-3)]"
              }`}
              onClick={() => setLocale("ru")}
            >
              {t("profile.interface.ru")}
            </button>
            <button
              type="button"
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                locale === "kk"
                  ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-strong)] ring-2 ring-[var(--accent)]/40"
                  : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[var(--surface-3)]"
              }`}
              onClick={() => setLocale("kk")}
            >
              {t("profile.interface.kk")}
            </button>
          </div>
        </article>

        <article className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            {t("profile.account")}
          </h2>
          <div className="mt-4 space-y-3">
            <div className="metric-row">
              <span>{t("profile.name")}</span>
              <span className="mono">
                {profile?.name ?? profile?.email ?? "—"}
              </span>
            </div>
            <div className="metric-row">
              <span>{t("profile.email")}</span>
              <span className="mono">{profile?.email ?? "—"}</span>
            </div>
            <div className="metric-row">
              <span>{t("profile.timezone")}</span>
              <span className="mono">{profile?.timezone ?? "—"}</span>
            </div>
            <div className="metric-row">
              <span>{t("profile.language")}</span>
              <span className="mono">
                {profile?.locale ? localeLabel[profile.locale] ?? profile.locale : "—"}
              </span>
            </div>
          </div>
        </article>

        <article className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("profile.accounts")}
            </h2>
            <button
              className="action-btn"
              type="button"
              onClick={() => setShowAddAccount(true)}
            >
              {t("profile.addAccount")}
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {t("profile.accountsHint")}
          </p>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-gradient-to-b from-[var(--surface-2)] to-transparent px-6 py-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] ring-1 ring-[var(--line)]">
                  💳
                </div>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--ink-muted)]">
                  {t("profile.noAccounts")}
                </p>
              </div>
            ) : (
              accounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  deleteLabel={t("common.delete")}
                  editLabel={t("common.edit")}
                  onDelete={() => setDeleteConfirmId(acc.id)}
                  onEdit={() => setEditingAccount(acc)}
                />
              ))
            )}
          </div>
        </article>

        <article className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            {t("profile.security")}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {t("profile.securityHint")}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={ROUTES.forgotPassword}
              className="flex flex-col gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 transition hover:bg-[var(--surface-3)]"
            >
              <span className="flex items-center justify-between text-sm font-medium text-[var(--ink-strong)]">
                {t("profile.resetPassword")}
                <span className="text-[var(--ink-muted)]">→</span>
              </span>
              <span className="text-xs text-[var(--ink-muted)]">
                {t("profile.resetPasswordDesc")}
              </span>
            </Link>
            <Link
              href={ROUTES.security}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--ink-strong)] transition hover:bg-[var(--surface-3)]"
            >
              <span>{t("profile.sessions")}</span>
              <span className="text-[var(--ink-muted)]">→</span>
            </Link>
            <Link
              href={ROUTES.notifications}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--ink-strong)] transition hover:bg-[var(--surface-3)]"
            >
              <span>{t("profile.notifications")}</span>
              <span className="text-[var(--ink-muted)]">→</span>
            </Link>
          </div>
        </article>

        <article className="card p-5 md:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("profile.planTitle")} {planLabel}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {t("profile.planSubtitle")}
              </p>
              {planLimitsText ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">{planLimitsText}</p>
              ) : null}
            </div>
            <ActionInfoModal
              confirmLabel={t("profile.subscriptionModalConfirm")}
              description={t("profile.subscriptionModalDesc")}
              items={[
                `Текущий план: ${planLabel}`,
                "Pro: ₸ 2 990 / месяц",
                "Пробный период: 7 дней",
              ]}
              title={t("profile.subscriptionModalTitle")}
              triggerClassName="action-btn"
              triggerLabel={t("profile.manageSubscription")}
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
              {t("profile.deleteAccountTitle")}
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {t("profile.deleteAccountBody").replace(
                "{name}",
                accounts.find((a) => a.id === deleteConfirmId)?.name ?? "—",
              )}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-strong)] transition hover:bg-[var(--surface-3)]"
                onClick={() => setDeleteConfirmId(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-[#9f1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] disabled:opacity-60"
                onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
              >
                {deletingId === deleteConfirmId ? t("profile.deleting") : t("common.delete")}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
