"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { usePlan } from "@/app/providers/plan-provider";
import { UpgradeModal } from "@/features/upgrade/ui/upgrade-modal";
import { FAMILY_TABS, type FamilyTabId } from "@/features/household/lib/constants";
import { getHouseholdMyRole } from "@/features/household/lib/format";
import { FamilyAccountsTab } from "@/features/household/ui/family-accounts-tab";
import { FamilyBudgetsTab } from "@/features/household/ui/family-budgets-tab";
import { FamilyMembersTab } from "@/features/household/ui/family-members-tab";
import { FamilyOverviewTab } from "@/features/household/ui/family-overview-tab";
import { FamilyTransactionsTab } from "@/features/household/ui/family-transactions-tab";
import { InviteMemberModal } from "@/features/household/ui/invite-member-modal";
import {
  createHousehold,
  deleteHouseholdMember,
  FeatureGatedError,
  getHousehold,
  getHouseholdOverview,
  inviteHouseholdMember,
  leaveHousehold,
  patchHouseholdMember,
} from "@/shared/api";
import type {
  Household,
  HouseholdMemberRole,
  HouseholdOverviewResponse,
} from "@/shared/api";
import { useBodyScrollLock } from "@/shared/lib";
import { isFeatureGatedError } from "@/shared/lib/is-feature-gated";
import { isHouseholdMembersLimitError } from "@/shared/lib/household-errors";
import { useI18n } from "@/shared/i18n";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";

export function FamilyPageContent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { plan } = usePlan();
  const familyModeEnabled = plan?.features?.familyMode ?? false;

  const [activeTab, setActiveTab] = useState<FamilyTabId>("overview");
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<HouseholdOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdMemberRole>("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessEmail, setInviteSuccessEmail] = useState<string | null>(null);

  const [roleError, setRoleError] = useState<string | null>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [deleteMemberSubmitting, setDeleteMemberSubmitting] = useState(false);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const refreshHousehold = useCallback(() => {
    getHousehold()
      .then(setHousehold)
      .catch((err) => setError(err?.message ?? t("family.loadError")));
  }, [t]);

  const refreshOverview = useCallback(() => {
    if (!household?.id) return;
    setOverviewError(null);
    setOverviewLoading(true);
    getHouseholdOverview()
      .then(setOverview)
      .catch((err) => setOverviewError(err?.message ?? t("family.loadError")))
      .finally(() => setOverviewLoading(false));
  }, [household?.id, t]);

  useEffect(() => {
    getHousehold()
      .then(setHousehold)
      .catch((err) => setError(err?.message ?? t("family.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!household?.id) {
      setOverview(null);
      return;
    }
    refreshOverview();
  }, [household?.id, refreshOverview]);

  const showUpgrade = (hint?: string) => {
    setUpgradeMessage(hint ?? t("billing.featureGated.family_mode"));
    setUpgradeOpen(true);
  };

  const handleGatedError = (err: unknown, fallback: string) => {
    if (isHouseholdMembersLimitError(err)) {
      return t("errors.household_members_limit");
    }
    if (err instanceof FeatureGatedError || isFeatureGatedError(err)) {
      const hint =
        err instanceof FeatureGatedError
          ? err.upgradeHint
          : (err as { upgradeHint?: string }).upgradeHint;
      showUpgrade(hint);
      return null;
    }
    return (err as Error)?.message ?? fallback;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    if (!name) return;
    if (!familyModeEnabled) {
      showUpgrade();
      return;
    }
    setCreateSubmitting(true);
    try {
      const h = await createHousehold({ name });
      setHousehold(h);
    } catch (err) {
      const msg = handleGatedError(err, t("family.loadError"));
      if (msg) setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccessEmail(null);
    const email = inviteEmail.trim();
    if (!email) return;
    if (!familyModeEnabled) {
      showUpgrade();
      return;
    }
    setInviteSubmitting(true);
    try {
      const updated = await inviteHouseholdMember({ email, role: inviteRole });
      setHousehold(updated);
      setInviteSuccessEmail(email);
      setInviteEmail("");
      refreshOverview();
    } catch (err) {
      const msg = handleGatedError(err, t("family.loadError"));
      if (msg) setInviteError(msg);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: HouseholdMemberRole) => {
    setRoleError(null);
    try {
      const updated = await patchHouseholdMember(memberId, { role });
      setHousehold(updated);
      refreshOverview();
    } catch (err) {
      setRoleError((err as Error)?.message ?? t("family.loadError"));
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
      setRoleError((err as Error)?.message ?? t("family.loadError"));
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
      setLeaveError((err as Error)?.message ?? t("family.loadError"));
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const members = household?.members ?? [];
  const currentMember = members.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === "owner";
  const canInvite =
    household?.features?.canInvite ??
    (currentMember?.role === "owner" || currentMember?.role === "member");
  const canManageBudgets =
    household?.features?.canManageBudgets ?? isOwner || currentMember?.role === "member";

  const overlayOpen = inviteOpen || !!deleteMemberId || leaveOpen;
  useBodyScrollLock(overlayOpen);

  return (
    <>
      <AppShell
        active="profile"
        title={t("family.title")}
        subtitle={t("family.subtitle")}
        actionAs={
          household && canInvite && activeTab === "members" ? (
            <button
              className="action-btn"
              type="button"
              onClick={() => {
                setInviteOpen(true);
                setInviteError(null);
                setInviteSuccessEmail(null);
              }}
            >
              {t("family.invites.invite")}
            </button>
          ) : undefined
        }
      >
        <ExtraScreensNav active="family" compact />

        {loading ? (
          <p className="metric-label mt-4">{t("family.loading")}</p>
        ) : error ? (
          <div className="alert alert-warn mt-4">{error}</div>
        ) : !household ? (
          <section className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[480px]">
            <article className="card p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("family.createTitle")}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("family.createHint")}</p>
              <form onSubmit={handleCreate} className="mt-4 grid gap-3">
                {createError && <div className="alert alert-warn">{createError}</div>}
                <label className="auth-field">
                  <span>
                    {t("family.createName")} <span className="text-[#9f1239]">*</span>
                  </span>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Семья Иванова"
                    maxLength={255}
                    required
                    autoComplete="off"
                  />
                </label>
                <button className="action-btn" disabled={createSubmitting} type="submit">
                  {createSubmitting ? t("family.createSubmitting") : t("family.createSubmit")}
                </button>
              </form>
              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                  {t("family.howItWorks")}
                </p>
                <div className="alert">{t("family.roles.owner")}</div>
                <div className="alert">{t("family.roles.member")}</div>
                <div className="alert">{t("family.roles.viewer")}</div>
              </div>
            </article>
          </section>
        ) : (
          <section className="mt-4">
            <nav
              aria-label={t("family.title")}
              className="mb-5 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
            >
              {FAMILY_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition md:px-4 md:py-2.5 ${
                    activeTab === tab
                      ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {t(`family.tabs.${tab}`)}
                </button>
              ))}
            </nav>

            {activeTab === "overview" && (
              <FamilyOverviewTab
                household={household}
                overview={overview}
                overviewError={overviewError}
                overviewLoading={overviewLoading}
              />
            )}
            {activeTab === "members" && (
              <FamilyMembersTab
                canInvite={canInvite}
                household={household}
                isOwner={isOwner}
                onInviteClick={() => {
                  setInviteOpen(true);
                  setInviteError(null);
                  setInviteSuccessEmail(null);
                }}
                onLeaveClick={() => {
                  setLeaveOpen(true);
                  setLeaveError(null);
                }}
                onRefreshHousehold={refreshHousehold}
                onRemoveMember={setDeleteMemberId}
                onRoleChange={handleRoleChange}
                roleError={roleError}
                userId={user?.id}
              />
            )}
            {activeTab === "accounts" && <FamilyAccountsTab />}
            {activeTab === "transactions" && <FamilyTransactionsTab />}
            {activeTab === "budgets" && (
              <FamilyBudgetsTab canManage={canManageBudgets} household={household} />
            )}
          </section>
        )}
      </AppShell>

      <InviteMemberModal
        email={inviteEmail}
        error={inviteError}
        onClose={() => setInviteOpen(false)}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onSubmit={handleInvite}
        open={inviteOpen}
        role={inviteRole}
        submitting={inviteSubmitting}
        successEmail={inviteSuccessEmail}
      />

      {deleteMemberId && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDeleteMemberId(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <p className="font-medium text-[var(--ink-strong)]">{t("family.members.remove")}?</p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="tx-inline-btn w-full sm:flex-1"
                onClick={() => setDeleteMemberId(null)}
                type="button"
              >
                {t("common.cancel")}
              </button>
              <button
                className="action-btn w-full bg-[#9f1239] hover:bg-[#7f1d1d] sm:flex-1"
                disabled={deleteMemberSubmitting}
                onClick={() => void handleRemoveMember()}
                type="button"
              >
                {deleteMemberSubmitting ? t("common.loading") : t("common.delete")}
              </button>
            </div>
          </section>
        </div>
      )}

      {leaveOpen && (
        <div className="fixed inset-0 z-[82] overflow-hidden">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setLeaveOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <p className="font-medium text-[var(--ink-strong)]">
              {t("family.members.leaveConfirm")}
            </p>
            {leaveError && <div className="alert alert-warn mt-3">{leaveError}</div>}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="tx-inline-btn w-full sm:flex-1"
                onClick={() => setLeaveOpen(false)}
                type="button"
              >
                {t("common.cancel")}
              </button>
              <button
                className="action-btn w-full sm:flex-1"
                disabled={leaveSubmitting}
                onClick={() => void handleLeave()}
                type="button"
              >
                {leaveSubmitting ? t("common.loading") : t("family.members.leave")}
              </button>
            </div>
          </section>
        </div>
      )}

      <UpgradeModal
        message={upgradeMessage}
        onClose={() => setUpgradeOpen(false)}
        open={upgradeOpen}
      />
    </>
  );
}
