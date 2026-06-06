"use client";

import type { Household, HouseholdOverviewResponse } from "@/shared/api";
import { formatMoney } from "@/shared/lib";
import { useI18n } from "@/shared/i18n";
import {
  formatPeriodLabel,
  getHouseholdMyRole,
  roleLabel,
} from "@/features/household/lib/format";

type FamilyOverviewTabProps = {
  household: Household;
  overview: HouseholdOverviewResponse | null;
  overviewLoading: boolean;
  overviewError: string | null;
};

export function FamilyOverviewTab({
  household,
  overview,
  overviewLoading,
  overviewError,
}: FamilyOverviewTabProps) {
  const { t, locale } = useI18n();
  const members = household.members ?? [];
  const membersCount = household.membersCount ?? members.length;
  const membersLimit = household.membersLimit ?? 5;
  const pendingCount = household.pendingCount ?? household.pendingInvites?.length ?? 0;
  const displayRole = overview?.household.my_role ?? getHouseholdMyRole(household);

  return (
    <article className="card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{household.name}</h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {t("family.membersLimit")
              .replace("{count}", String(membersCount))
              .replace("{limit}", String(membersLimit))}
            {pendingCount > 0
              ? ` · ${t("family.pendingCount").replace("{count}", String(pendingCount))}`
              : ""}
            {overview?.period && (
              <span className="ml-2">
                · {formatPeriodLabel(overview.period.dateFrom, overview.period.dateTo, locale)}
              </span>
            )}
          </p>
        </div>
        {displayRole && (
          <span className={`budget-pill ${displayRole === "owner" ? "normal" : ""}`}>
            {roleLabel(displayRole, t)}
          </span>
        )}
      </div>

      {overviewLoading && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          {t("family.overview.loadingOverview")}
        </p>
      )}
      {overviewError && <div className="alert alert-warn mt-4">{overviewError}</div>}
      {overview && !overviewLoading && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                {t("family.overview.income")}
              </p>
              <p className="mono mt-1 text-lg font-semibold text-[#166534]">
                {formatMoney(overview.totals.income)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                {t("family.overview.expense")}
              </p>
              <p className="mono mt-1 text-lg font-semibold text-[#9f1239]">
                {formatMoney(overview.totals.expense)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                {t("family.overview.balance")}
              </p>
              <p className="mono mt-1 text-lg font-semibold text-[var(--ink-strong)]">
                {formatMoney(overview.totals.balance)}
              </p>
            </div>
          </div>

          {overview.balances_by_member.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--ink-strong)]">
                {t("family.overview.byMember")}
              </p>
              <ul className="space-y-2">
                {overview.balances_by_member.map((row) => (
                  <li
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink-strong)]">
                        {row.name ?? row.userId}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {roleLabel(row.role, t)}
                      </p>
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
  );
}
