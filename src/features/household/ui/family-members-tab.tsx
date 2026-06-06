"use client";

import { useState } from "react";
import type { Household, HouseholdMember, HouseholdMemberRole } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { ROLE_OPTIONS } from "@/features/household/lib/constants";
import { formatJoinedAt, getHouseholdMyRole, roleLabel } from "@/features/household/lib/format";
import { PendingInvitesList } from "./pending-invites-list";

type FamilyMembersTabProps = {
  household: Household;
  userId: string | undefined;
  isOwner: boolean;
  canInvite: boolean;
  roleError: string | null;
  onInviteClick: () => void;
  onRoleChange: (memberId: string, role: HouseholdMemberRole) => Promise<void>;
  onRemoveMember: (memberId: string) => void;
  onLeaveClick: () => void;
  onRefreshHousehold: () => void;
};

export function FamilyMembersTab({
  household,
  userId,
  isOwner,
  canInvite,
  roleError,
  onInviteClick,
  onRoleChange,
  onRemoveMember,
  onLeaveClick,
  onRefreshHousehold,
}: FamilyMembersTabProps) {
  const { t, locale } = useI18n();
  const members = household.members ?? [];
  const pendingInvites = household.pendingInvites ?? [];
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [roleEditValue, setRoleEditValue] = useState<HouseholdMemberRole>("member");
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const openRoleEdit = (member: HouseholdMember) => {
    setRoleEditId(member.id);
    setRoleEditValue(member.role);
  };

  const handleRoleSave = async (memberId: string) => {
    setRoleSubmitting(true);
    try {
      await onRoleChange(memberId, roleEditValue);
      setRoleEditId(null);
    } finally {
      setRoleSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
      <article className="card p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          {t("family.members.title")}
        </h2>
        {roleError && <div className="alert alert-warn mt-3">{roleError}</div>}

        <div className="mt-4 space-y-2">
          {members.map((member) => {
            const isMe = member.userId === userId;
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
                      {isMe && (
                        <span className="ml-1.5 text-xs text-[var(--ink-muted)]">
                          {t("family.members.you")}
                        </span>
                      )}
                    </p>
                    <p className="mono text-xs text-[var(--ink-muted)]">{member.email}</p>
                    <p className="mono mt-0.5 text-xs text-[var(--ink-muted)]">
                      {t("family.members.joined").replace(
                        "{date}",
                        formatJoinedAt(member.joinedAt, locale),
                      )}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <select
                          className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-sm"
                          value={roleEditValue}
                          onChange={(e) =>
                            setRoleEditValue(e.target.value as HouseholdMemberRole)
                          }
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel(r, t)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="action-btn h-8 px-2.5 text-xs"
                          disabled={roleSubmitting}
                          onClick={() => void handleRoleSave(member.id)}
                        >
                          {roleSubmitting ? "…" : t("common.save")}
                        </button>
                        <button
                          type="button"
                          className="tx-inline-btn h-8 rounded-lg px-2 text-xs"
                          onClick={() => setRoleEditId(null)}
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="mono text-xs text-[var(--ink-muted)]">
                          {roleLabel(member.role, t)}
                        </span>
                        {isOwner && !isMe && (
                          <>
                            <button
                              type="button"
                              className="tx-inline-btn h-8 rounded-lg px-2.5 text-xs"
                              onClick={() => openRoleEdit(member)}
                            >
                              {t("family.members.changeRole")}
                            </button>
                            <button
                              type="button"
                              className="tx-inline-btn danger h-8 rounded-lg px-2.5 text-xs"
                              onClick={() => onRemoveMember(member.id)}
                            >
                              {t("family.members.remove")}
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

        <PendingInvitesList
          invites={pendingInvites}
          onCancelled={onRefreshHousehold}
        />

        {canInvite && (
          <div className="mt-4">
            <button
              type="button"
              className="tx-inline-btn w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-medium"
              onClick={onInviteClick}
            >
              {t("family.invites.inviteByEmail")}
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="tx-inline-btn w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-medium text-[var(--ink-soft)]"
            onClick={onLeaveClick}
          >
            {t("family.members.leave")}
          </button>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">{t("family.members.leaveHint")}</p>
        </div>
      </article>

      <aside>
        <article className="card p-5">
          <h2 className="text-base font-semibold text-[var(--ink-strong)]">
            {t("family.members.rightsTitle")}
          </h2>
          <div className="mt-4 space-y-2">
            <div className="alert">
              <span className="font-medium">{t("family.roles.owner")}</span> —{" "}
              {t("family.members.rightsOwner")}
            </div>
            <div className="alert">
              <span className="font-medium">{t("family.roles.member")}</span> —{" "}
              {t("family.members.rightsMember")}
            </div>
            <div className="alert">
              <span className="font-medium">{t("family.roles.viewer")}</span> —{" "}
              {t("family.members.rightsViewer")}
            </div>
          </div>
          {getHouseholdMyRole(household) && (
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              {roleLabel(getHouseholdMyRole(household)!, t)}
            </p>
          )}
        </article>
      </aside>
    </div>
  );
}
