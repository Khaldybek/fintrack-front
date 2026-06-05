"use client";

import type { HouseholdMemberRole } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { INVITE_ROLE_OPTIONS } from "@/features/household/lib/constants";
import { roleLabel } from "@/features/household/lib/format";

type InviteMemberModalProps = {
  open: boolean;
  email: string;
  role: HouseholdMemberRole;
  submitting: boolean;
  error: string | null;
  successEmail: string | null;
  onClose: () => void;
  onEmailChange: (v: string) => void;
  onRoleChange: (v: HouseholdMemberRole) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function InviteMemberModal({
  open,
  email,
  role,
  submitting,
  error,
  successEmail,
  onClose,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: InviteMemberModalProps) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden">
      <button
        aria-label={t("common.close")}
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center md:items-center md:pt-8">
        <section className="pointer-events-auto flex max-h-[min(92dvh,100%)] w-full max-w-[440px] flex-col rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.25)] md:rounded-2xl md:shadow-2xl">
          <div className="flex shrink-0 flex-col border-b border-[var(--line)] px-4 pb-3 pt-2 md:px-6 md:pb-4 md:pt-4">
            <div className="mb-2 flex justify-center md:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("family.invites.inviteByEmail")}
              </h3>
              <button className="tx-inline-btn" type="button" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
            {successEmail && (
              <div className="mb-3 mt-2 alert text-[#166534]">
                {t("family.invites.sent").replace("{email}", successEmail)}
              </div>
            )}
            <form onSubmit={onSubmit} className="grid gap-3 pb-2">
              {error && <div className="alert alert-warn">{error}</div>}
              <label className="auth-field">
                <span>
                  {t("family.invites.email")} <span className="text-[#9f1239]">*</span>
                </span>
                <input
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="user@example.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>{t("family.invites.role")}</span>
                <select
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value as HouseholdMemberRole)}
                >
                  {INVITE_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r, t)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sticky bottom-0 z-[1] flex flex-col-reverse gap-2 bg-[var(--surface-1)] pt-2 sm:flex-row sm:items-center md:static md:bg-transparent md:pt-0">
                <button
                  className="tx-inline-btn w-full sm:w-auto"
                  type="button"
                  onClick={onClose}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="action-btn w-full sm:flex-1"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? t("family.invites.sending") : t("family.invites.send")}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
