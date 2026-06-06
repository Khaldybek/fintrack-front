"use client";

import { useCallback, useEffect, useState } from "react";
import { getHouseholdAccounts, getHouseholdTransactions } from "@/shared/api";
import type {
  HouseholdSharedAccount,
  HouseholdTransaction,
} from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatMoneyValue } from "@/features/household/lib/format";

const PAGE_SIZE = 20;

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FamilyTransactionsTab() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<HouseholdSharedAccount[]>([]);
  const [items, setItems] = useState<HouseholdTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [accountId, setAccountId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");

  useEffect(() => {
    getHouseholdAccounts().then(setAccounts).catch(() => {});
  }, []);

  const load = useCallback(
    (pageNum: number, append: boolean) => {
      setLoading(true);
      getHouseholdTransactions({
        dateFrom,
        dateTo,
        accountId: accountId || undefined,
        memberUserId: memberUserId || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      })
        .then((res) => {
          setTotal(res.total);
          setItems((prev) => (append ? [...prev, ...res.items] : res.items));
          setPage(pageNum);
        })
        .catch((err) => setError((err as Error)?.message ?? t("common.loadError")))
        .finally(() => setLoading(false));
    },
    [dateFrom, dateTo, accountId, memberUserId],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const members = Array.from(
    new Map(
      items.map((tx) => [tx.owner.userId, tx.owner]),
    ).values(),
  );

  return (
    <article className="card p-5 md:p-6">
      <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
        {t("family.transactions.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("family.transactions.hint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="auth-field min-w-[120px] flex-1">
          <span className="text-xs">{t("family.transactions.dateFrom")}</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="auth-field min-w-[120px] flex-1">
          <span className="text-xs">{t("family.transactions.dateTo")}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label className="auth-field min-w-[140px] flex-1">
          <span className="text-xs">{t("family.transactions.account")}</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">{t("family.transactions.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {members.length > 0 && (
          <label className="auth-field min-w-[140px] flex-1">
            <span className="text-xs">{t("family.transactions.member")}</span>
            <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)}>
              <option value="">{t("family.transactions.allMembers")}</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name ?? m.userId}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <div className="alert alert-warn mt-4">{error}</div>}
      {loading && items.length === 0 && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("family.transactions.empty")}</p>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((tx) => (
          <li
            key={tx.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--ink-strong)]">
                {tx.memo ?? tx.category?.name ?? "—"}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {tx.date} · {tx.category?.name ?? "—"} ·{" "}
                {t("family.transactions.owner").replace(
                  "{name}",
                  tx.owner.name ?? tx.owner.userId,
                )}
              </p>
            </div>
            <span
              className={`mono font-semibold ${tx.amount_minor < 0 ? "text-[#9f1239]" : "text-[#166534]"}`}
            >
              {formatMoneyValue(
                typeof tx.amount === "string" ? undefined : tx.amount,
              ) || (typeof tx.amount === "string" ? tx.amount : String(tx.amount_minor))}
            </span>
          </li>
        ))}
      </ul>

      {items.length < total && (
        <button
          className="filter-chip mt-4"
          disabled={loading}
          onClick={() => load(page + 1, true)}
          type="button"
        >
          {loading ? t("common.loading") : t("family.transactions.loadMore")}
        </button>
      )}
    </article>
  );
}
