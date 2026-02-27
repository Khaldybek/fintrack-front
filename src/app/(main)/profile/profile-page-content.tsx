"use client";

import { useEffect, useState } from "react";
import { ActionInfoModal } from "@/shared/ui";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import { getMe, getMePlan } from "@/shared/api";
import type { Profile, PlanResponse } from "@/shared/api";

const localeLabel: Record<string, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

export function ProfilePageContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getMePlan()])
      .then(([me, planData]) => {
        setProfile(me);
        setPlan(planData);
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
    </AppShell>
  );
}
