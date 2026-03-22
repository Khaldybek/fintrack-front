"use client";

import type { Account } from "@/shared/api";

const CURRENCY_GRADIENT: Record<string, string> = {
  KZT: "from-emerald-600 to-teal-700",
  USD: "from-slate-600 to-slate-800",
  EUR: "from-indigo-600 to-violet-700",
  RUB: "from-blue-600 to-cyan-700",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export type AccountCardProps = {
  account: Account;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function AccountCard({
  account,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: AccountCardProps) {
  const cur = account.currency?.toUpperCase() ?? "—";
  const gradient = CURRENCY_GRADIENT[cur] ?? "from-slate-500 to-slate-700";
  const balance =
    account.balance?.formatted ??
    `${account.balance?.amount_minor ?? 0} ${account.currency}`;

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-[color-mix(in_srgb,var(--line)_70%,#94a3b8_30%)] hover:shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500/90 to-teal-600/80"
      />
      <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold tracking-tight text-white shadow-inner ring-2 ring-white/20`}
          >
            {initials(account.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="truncate text-base font-semibold text-[var(--ink-strong)]">
                {account.name}
              </h3>
              <span className="inline-flex shrink-0 items-center rounded-lg bg-[var(--surface-2)] px-2 py-0.5 mono text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)] ring-1 ring-[var(--line)]">
                {cur}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-3 sm:flex-row sm:items-center sm:border-t-0 sm:pt-0">
          <p className="mono text-right text-lg font-semibold tabular-nums tracking-tight text-[var(--ink-strong)] sm:min-w-[8.5rem] sm:text-xl">
            {balance}
          </p>
          <div className="flex justify-end gap-2 sm:justify-start">
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--ink-soft)] shadow-sm transition hover:border-[var(--surface-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-strong)]"
              onClick={onEdit}
            >
              {editLabel}
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-[#9f1239] shadow-sm transition hover:border-red-300 hover:bg-red-50"
              onClick={onDelete}
            >
              {deleteLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
