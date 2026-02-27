"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import {
  getHousehold,
  createHousehold,
  inviteHouseholdMember,
  patchHouseholdMember,
} from "@/shared/api";
import type { Household, HouseholdMember, HouseholdMemberRole } from "@/shared/api";

const ROLE_LABEL: Record<HouseholdMemberRole, string> = {
  owner: "Владелец",
  member: "Участник",
  viewer: "Наблюдатель",
};

const ROLE_OPTIONS: HouseholdMemberRole[] = ["owner", "member", "viewer"];

function formatJoinedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function FamilyPage() {
  const { user } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Создание домохозяйства
  const [createName, setCreateName] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Приглашение участника
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdMemberRole>("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Смена роли
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [roleEditValue, setRoleEditValue] = useState<HouseholdMemberRole>("member");
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    getHousehold()
      .then(setHousehold)
      .catch((err) => setError(err?.message ?? "Не удалось загрузить семейный режим"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    if (!name) { setCreateError("Введите название домохозяйства"); return; }
    setCreateSubmitting(true);
    try {
      const h = await createHousehold({ name });
      setHousehold(h);
    } catch (err) {
      setCreateError((err as Error)?.message ?? "Не удалось создать домохозяйство");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    const email = inviteEmail.trim();
    if (!email) { setInviteError("Введите email"); return; }
    setInviteSubmitting(true);
    try {
      const updated = await inviteHouseholdMember({ email, role: inviteRole });
      setHousehold(updated);
      setInviteSuccess(true);
      setInviteEmail("");
    } catch (err) {
      setInviteError((err as Error)?.message ?? "Не удалось пригласить участника");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const openRoleEdit = (member: HouseholdMember) => {
    setRoleEditId(member.id);
    setRoleEditValue(member.role);
    setRoleError(null);
  };

  const handleRoleChange = async (memberId: string) => {
    setRoleError(null);
    setRoleSubmitting(true);
    try {
      const updated = await patchHouseholdMember(memberId, { role: roleEditValue });
      setHousehold(updated);
      setRoleEditId(null);
    } catch (err) {
      setRoleError((err as Error)?.message ?? "Не удалось изменить роль");
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Является ли текущий пользователь владельцем
  const currentMember = household?.members.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === "owner";

  return (
    <>
      <AppShell
        active="profile"
        title="Семейный режим"
        subtitle="Совместный бюджет, роли доступа и прозрачность общих расходов."
        actionAs={
          household && isOwner ? (
            <button className="action-btn" type="button" onClick={() => { setInviteOpen(true); setInviteError(null); setInviteSuccess(false); }}>
              + Пригласить
            </button>
          ) : undefined
        }
      >
        <ExtraScreensNav active="family" compact />

        {loading ? (
          <p className="metric-label mt-4">Загрузка…</p>
        ) : error ? (
          <div className="alert alert-warn mt-4">{error}</div>
        ) : !household ? (
          /* ——— Создание домохозяйства ——— */
          <section className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[480px]">
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Создать домохозяйство</h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                У вас ещё нет семейного режима. Введите название и пригласите участников.
              </p>
              <form onSubmit={handleCreate} className="mt-4 grid gap-3">
                {createError && <div className="alert alert-warn">{createError}</div>}
                <label className="auth-field">
                  <span>Название домохозяйства <span className="text-[#9f1239]">*</span></span>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Семья Иванова"
                    maxLength={255}
                    required
                    autoComplete="off"
                  />
                </label>
                <button className="action-btn" type="submit" disabled={createSubmitting}>
                  {createSubmitting ? "Создаём…" : "Создать"}
                </button>
              </form>

              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Как это работает</p>
                <div className="alert">Владелец: полный контроль, управление участниками</div>
                <div className="alert">Участник: добавление трат и целей</div>
                <div className="alert">Наблюдатель: только просмотр аналитики</div>
              </div>
            </article>
          </section>
        ) : (
          /* ——— Домохозяйство ——— */
          <section className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <article className="card p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{household.name}</h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{household.members.length} участников</p>
                </div>
                {currentMember && (
                  <span className={`budget-pill ${currentMember.role === "owner" ? "normal" : ""}`}>
                    Я: {ROLE_LABEL[currentMember.role]}
                  </span>
                )}
              </div>

              {roleError && <div className="alert alert-warn mb-3">{roleError}</div>}

              <div className="space-y-2">
                {household.members.map((member) => {
                  const isMe = member.userId === user?.id;
                  const isEditing = roleEditId === member.id;

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--ink-strong)]">
                            {member.name ?? member.email}
                            {isMe && <span className="ml-1.5 text-xs text-[var(--ink-muted)]">(вы)</span>}
                          </p>
                          <p className="mono text-xs text-[var(--ink-muted)]">{member.email}</p>
                          <p className="mono text-xs text-[var(--ink-muted)] mt-0.5">
                            Присоединился {formatJoinedAt(member.joinedAt)}
                          </p>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {isEditing ? (
                            <>
                              <select
                                className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-sm text-[var(--ink-strong)]"
                                value={roleEditValue}
                                onChange={(e) => setRoleEditValue(e.target.value as HouseholdMemberRole)}
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="action-btn h-8 rounded-lg px-3 text-xs"
                                onClick={() => handleRoleChange(member.id)}
                                disabled={roleSubmitting}
                              >
                                {roleSubmitting ? "…" : "Сохранить"}
                              </button>
                              <button
                                type="button"
                                className="tx-inline-btn h-8 rounded-lg px-2 text-xs"
                                onClick={() => setRoleEditId(null)}
                              >
                                Отмена
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="mono text-xs text-[var(--ink-muted)]">
                                {ROLE_LABEL[member.role] ?? member.role}
                              </span>
                              {isOwner && !isMe && (
                                <button
                                  type="button"
                                  className="tx-inline-btn h-8 rounded-lg px-2.5 text-xs"
                                  onClick={() => openRoleEdit(member)}
                                >
                                  Изменить роль
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isOwner && (
                <div className="mt-4">
                  <button
                    type="button"
                    className="tx-inline-btn w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-medium"
                    onClick={() => { setInviteOpen(true); setInviteError(null); setInviteSuccess(false); }}
                  >
                    + Пригласить участника по email
                  </button>
                </div>
              )}
            </article>

            <aside className="flex flex-col gap-5">
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">Права доступа</h2>
                <div className="mt-4 space-y-2">
                  <div className="alert">
                    <span className="font-medium">Владелец</span> — полный контроль, управление участниками и ролями
                  </div>
                  <div className="alert">
                    <span className="font-medium">Участник</span> — добавление трат и целей
                  </div>
                  <div className="alert">
                    <span className="font-medium">Наблюдатель</span> — только просмотр аналитики
                  </div>
                </div>
              </article>
            </aside>
          </section>
        )}
      </AppShell>

      {/* Модал приглашения */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setInviteOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[440px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Пригласить участника</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setInviteOpen(false)}>Закрыть</button>
            </div>

            {inviteSuccess && (
              <div className="mb-3 alert text-[#166534]">
                Приглашение отправлено. Участник добавлен в домохозяйство.
              </div>
            )}

            <form onSubmit={handleInvite} className="grid gap-3">
              {inviteError && <div className="alert alert-warn">{inviteError}</div>}
              <label className="auth-field">
                <span>Email <span className="text-[#9f1239]">*</span></span>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Роль</span>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as HouseholdMemberRole)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                Пользователь с этим email должен быть зарегистрирован в FinTrack.
              </p>
              <div className="mt-1 flex gap-2">
                <button className="action-btn flex-1" type="submit" disabled={inviteSubmitting}>
                  {inviteSubmitting ? "Отправляем…" : "Пригласить"}
                </button>
                <button className="tx-inline-btn" type="button" onClick={() => setInviteOpen(false)}>Отмена</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
