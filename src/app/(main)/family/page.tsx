"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import {
  getHousehold,
  createHousehold,
  inviteHouseholdMember,
  patchHouseholdMember,
  deleteHouseholdMember,
  leaveHousehold,
  getHouseholdOverview,
} from "@/shared/api";
import type {
  Household,
  HouseholdMember,
  HouseholdMemberRole,
  HouseholdOverviewResponse,
} from "@/shared/api";
import { formatMoney, useBodyScrollLock } from "@/shared/lib";

const ROLE_LABEL: Record<HouseholdMemberRole, string> = {
  owner: "Владелец",
  member: "Участник",
  viewer: "Наблюдатель",
};

/** Приглашать можно с ролью участник или наблюдатель (владелец назначается системой). */
const INVITE_ROLE_OPTIONS: HouseholdMemberRole[] = ["member", "viewer"];

const ROLE_OPTIONS: HouseholdMemberRole[] = ["owner", "member", "viewer"];

function formatJoinedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatPeriodLabel(from: string, to: string): string {
  const a = new Date(from + "T12:00:00");
  const b = new Date(to + "T12:00:00");
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return a.toLocaleDateString("ru-KZ", { month: "long", year: "numeric" });
  }
  return `${a.toLocaleDateString("ru-KZ", { day: "numeric", month: "short" })} — ${b.toLocaleDateString("ru-KZ", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function FamilyPage() {
  const { user } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<HouseholdOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

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

  // Удаление участника (owner)
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [deleteMemberSubmitting, setDeleteMemberSubmitting] = useState(false);

  // Выход из семьи
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const refreshOverview = useCallback(() => {
    if (!household?.id) return;
    setOverviewError(null);
    setOverviewLoading(true);
    getHouseholdOverview()
      .then(setOverview)
      .catch((err) => setOverviewError(err?.message ?? "Не удалось загрузить сводку"))
      .finally(() => setOverviewLoading(false));
  }, [household?.id]);

  useEffect(() => {
    getHousehold()
      .then(setHousehold)
      .catch((err) => setError(err?.message ?? "Не удалось загрузить семейный режим"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!household?.id) {
      setOverview(null);
      return;
    }
    refreshOverview();
  }, [household?.id, refreshOverview]);

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
      refreshOverview();
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
      refreshOverview();
    } catch (err) {
      setRoleError((err as Error)?.message ?? "Не удалось изменить роль");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteMemberId) return;
    setDeleteMemberSubmitting(true);
    try {
      const updated = await deleteHouseholdMember(deleteMemberId);
      setHousehold(updated);
      setDeleteMemberId(null);
      refreshOverview();
    } catch (err) {
      setRoleError((err as Error)?.message ?? "Не удалось удалить участника");
    } finally {
      setDeleteMemberSubmitting(false);
    }
  };

  const handleLeave = async () => {
    setLeaveError(null);
    setLeaveSubmitting(true);
    try {
      await leaveHousehold();
      setHousehold(null);
      setOverview(null);
      setLeaveOpen(false);
    } catch (err) {
      setLeaveError((err as Error)?.message ?? "Не удалось выйти из семьи");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const currentMember = household?.members.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === "owner";
  const myRoleFromOverview = overview?.household.my_role;
  const displayRole = myRoleFromOverview ?? currentMember?.role;

  const overlayOpen = inviteOpen || !!deleteMemberId || leaveOpen;
  useBodyScrollLock(overlayOpen);

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
                <div className="alert">Владелец: полный контроль, приглашения и роли участников</div>
                <div className="alert">Участник: добавление трат и целей</div>
                <div className="alert">Наблюдатель: только просмотр аналитики (без приглашений)</div>
              </div>
            </article>
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-5">
              {/* Сводка за период (GET /household/overview) */}
              <article className="card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{household.name}</h2>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      {overview?.household.members_count ?? household.members.length} участников
                      {overview?.period && (
                        <span className="ml-2">
                          · {formatPeriodLabel(overview.period.dateFrom, overview.period.dateTo)}
                        </span>
                      )}
                    </p>
                  </div>
                  {displayRole && (
                    <span className={`budget-pill ${displayRole === "owner" ? "normal" : ""}`}>
                      Я: {ROLE_LABEL[displayRole]}
                    </span>
                  )}
                </div>

                {overviewLoading && (
                  <p className="mt-4 text-sm text-[var(--ink-muted)]">Загрузка сводки…</p>
                )}
                {overviewError && (
                  <div className="alert alert-warn mt-4">{overviewError}</div>
                )}
                {overview && !overviewLoading && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Доходы</p>
                        <p className="mono mt-1 text-lg font-semibold text-[#166534]">
                          {formatMoney(overview.totals.income)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Расходы</p>
                        <p className="mono mt-1 text-lg font-semibold text-[#9f1239]">
                          {formatMoney(overview.totals.expense)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Баланс</p>
                        <p className="mono mt-1 text-lg font-semibold text-[var(--ink-strong)]">
                          {formatMoney(overview.totals.balance)}
                        </p>
                      </div>
                    </div>

                    {overview.balances_by_member.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-[var(--ink-strong)]">Баланс по участникам</p>
                        <ul className="space-y-2">
                          {overview.balances_by_member.map((row) => (
                            <li
                              key={row.userId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--ink-strong)]">{row.name ?? row.userId}</p>
                                <p className="text-xs text-[var(--ink-muted)]">{ROLE_LABEL[row.role]}</p>
                              </div>
                              <span className="mono text-sm font-semibold text-[var(--ink-strong)]">
                                {formatMoney(row.balance)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>

              <article className="card p-5 md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Участники</h2>
                {roleError && <div className="alert alert-warn mt-3">{roleError}</div>}

                <div className="mt-4 space-y-2">
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
                            <p className="mono mt-0.5 text-xs text-[var(--ink-muted)]">
                              Присоединился {formatJoinedAt(member.joinedAt)}
                            </p>
                          </div>

                          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
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
                                  <>
                                    <button
                                      type="button"
                                      className="tx-inline-btn h-8 rounded-lg px-2.5 text-xs"
                                      onClick={() => openRoleEdit(member)}
                                    >
                                      Изменить роль
                                    </button>
                                    <button
                                      type="button"
                                      className="tx-inline-btn danger h-8 rounded-lg px-2.5 text-xs"
                                      onClick={() => setDeleteMemberId(member.id)}
                                    >
                                      Удалить
                                    </button>
                                  </>
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

                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <button
                    type="button"
                    className="tx-inline-btn w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-medium text-[var(--ink-soft)]"
                    onClick={() => { setLeaveOpen(true); setLeaveError(null); }}
                  >
                    Выйти из семьи
                  </button>
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    Если вы единственный владелец, сначала передайте роль другому участнику или удалите домохозяйство согласно правилам сервиса.
                  </p>
                </div>
              </article>
            </div>

            <aside className="flex flex-col gap-5">
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">Права доступа</h2>
                <div className="mt-4 space-y-2">
                  <div className="alert">
                    <span className="font-medium">Владелец</span> — приглашения, смена ролей и удаление участников
                  </div>
                  <div className="alert">
                    <span className="font-medium">Участник</span> — добавление трат и целей
                  </div>
                  <div className="alert">
                    <span className="font-medium">Наблюдатель</span> — только просмотр (приглашать нельзя)
                  </div>
                </div>
              </article>
            </aside>
          </section>
        )}
      </AppShell>

      {/* Модал приглашения */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[80] overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setInviteOpen(false)}
            type="button"
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
            <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[440px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:rounded-2xl md:shadow-2xl">
              <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
                <div className="mb-2 flex justify-center md:hidden" aria-hidden>
                  <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">Пригласить участника</h3>
                  <button className="tx-inline-btn" type="button" onClick={() => setInviteOpen(false)}>Закрыть</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:px-6">
                {inviteSuccess && (
                  <div className="mb-3 mt-2 alert text-[#166534]">
                    Приглашение отправлено. Участник добавлен в домохозяйство.
                  </div>
                )}

                <form onSubmit={handleInvite} className="grid gap-3 pb-2">
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
                      {INVITE_ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Пользователь с этим email должен быть зарегистрирован в FinTrack. Наблюдатель не может приглашать других.
                  </p>
                  <div className="sticky bottom-0 z-[1] flex flex-col-reverse gap-2 bg-[var(--surface-1)] pt-2 sm:flex-row sm:items-center md:static md:bg-transparent md:pt-0">
                    <button className="tx-inline-btn w-full sm:w-auto" type="button" onClick={() => setInviteOpen(false)}>Отмена</button>
                    <button className="action-btn w-full sm:flex-1" type="submit" disabled={inviteSubmitting}>
                      {inviteSubmitting ? "Отправляем…" : "Пригласить"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Подтверждение удаления участника */}
      {deleteMemberId && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDeleteMemberId(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6">
            <p className="font-medium text-[var(--ink-strong)]">Удалить участника?</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Пользователь потеряет доступ к семейному бюджету. Действие доступно только владельцу.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button className="tx-inline-btn w-full sm:flex-1" type="button" onClick={() => setDeleteMemberId(null)}>Отмена</button>
              <button
                className="action-btn w-full bg-[#9f1239] hover:bg-[#7f1d1d] sm:flex-1"
                type="button"
                disabled={deleteMemberSubmitting}
                onClick={handleRemoveMember}
              >
                {deleteMemberSubmitting ? "Удаляем…" : "Удалить"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Выход из семьи */}
      {leaveOpen && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setLeaveOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6 md:pb-6">
            <p className="font-medium text-[var(--ink-strong)]">Выйти из семьи?</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Вы отключитесь от совместного бюджета. При необходимости вас снова пригласят по email.
            </p>
            {leaveError && <div className="alert alert-warn mt-3">{leaveError}</div>}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button className="tx-inline-btn w-full sm:flex-1" type="button" onClick={() => setLeaveOpen(false)}>Отмена</button>
              <button
                className="action-btn w-full sm:flex-1"
                type="button"
                disabled={leaveSubmitting}
                onClick={handleLeave}
              >
                {leaveSubmitting ? "Выход…" : "Выйти"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
