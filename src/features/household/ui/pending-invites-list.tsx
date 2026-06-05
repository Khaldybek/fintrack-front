"use client";

import type { Household, HouseholdPendingInvite } from "@/shared/api";
import { deleteHouseholdInvite } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatJoinedAt, roleLabel } from "@/features/household/lib/format";

type PendingInvitesListProps = {
  invites: HouseholdPendingInvite[];
  onCancelled: () => void;
  onHouseholdUpdate: (h: Household) => void;
};

export function PendingInvitesList({
  invites,
  onCancelled,
}: PendingInvitesListProps) {
  const { t } = useI18n();

  if (invites.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-[var(--ink-strong)]">
        {t("family.invites.title")}
      </p>
      <ul className="mt-2 space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--ink-strong)]">{inv.email}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {roleLabel(inv.role, t)} · {t("family.invites.pending")}
                {inv.expiresAt
                  ? ` · ${t("family.invites.expires").replace(
                      "{date}",
                      formatJoinedAt(inv.expiresAt),
                    )}`
                  : ""}
              </p>
            </div>
            <button
              className="tx-inline-btn h-8 rounded-lg px-2.5 text-xs"
              type="button"
              onClick={async () => {
                try {
                  await deleteHouseholdInvite(inv.id);
                  onCancelled();
                } catch {
                  /* parent may show error */
                }
              }}
            >
              {t("family.invites.cancel")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
