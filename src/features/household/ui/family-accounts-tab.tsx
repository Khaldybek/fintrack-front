"use client";

import { useCallback, useEffect, useState } from "react";
import { getHouseholdAccounts } from "@/shared/api";
import type { HouseholdSharedAccount } from "@/shared/api";
import { useI18n } from "@/shared/i18n";

export function FamilyAccountsTab() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<HouseholdSharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getHouseholdAccounts()
      .then(setAccounts)
      .catch((err) => setError((err as Error)?.message ?? t("common.loadError")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <article className="card p-5 md:p-6">
      <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
        {t("family.accounts.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("family.accounts.hint")}</p>

      {loading && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
      )}
      {error && <div className="alert alert-warn mt-4">{error}</div>}
      {!loading && !error && accounts.length === 0 && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("family.accounts.empty")}</p>
      )}
      <ul className="mt-4 space-y-2">
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
          >
            <div>
              <p className="font-semibold text-[var(--ink-strong)]">{acc.name}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {t("family.accounts.owner").replace(
                  "{name}",
                  acc.owner.name ?? acc.owner.email ?? acc.owner.userId,
                )}
              </p>
            </div>
            <span className="mono text-sm font-semibold">
              {acc.balance?.formatted ?? `${acc.balance?.amount_minor ?? 0} ${acc.currency}`}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
