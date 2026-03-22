"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import { getNotifications, getNotificationsCount } from "@/shared/api";
import type {
  NotificationItem,
  NotificationsCountResponse,
} from "@/shared/api";

const SOURCE_LABEL: Record<string, string> = {
  dashboard: "Дашборд",
  subscription: "Подписка",
  credit: "Кредит",
  salary: "Зарплата",
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

function severityBorder(sev: string): string {
  if (sev === "risk") return "border-l-4 border-l-[#9f1239]";
  if (sev === "attention") return "border-l-4 border-l-[#b45309]";
  return "border-l-4 border-l-[#166534]";
}

function severityBadge(sev: string): string {
  if (sev === "risk") return "budget-pill risk";
  if (sev === "attention") return "budget-pill warn";
  return "budget-pill normal";
}

function formatNotificationDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-KZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPageContent() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState<NotificationsCountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [daysAhead, setDaysAhead] = useState(14);
  const [includeStable, setIncludeStable] = useState(false);
  const [limit] = useState(50);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const [notifRes, countRes] = await Promise.allSettled([
      getNotifications({ daysAhead, limit, includeStable }),
      getNotificationsCount({ daysAhead }),
    ]);

    if (notifRes.status === "fulfilled") {
      setItems(notifRes.value?.items ?? []);
      setError(null);
    } else {
      setItems([]);
      setError(
        notifRes.reason instanceof Error
          ? notifRes.reason.message
          : "Не удалось загрузить уведомления",
      );
    }

    if (countRes.status === "fulfilled") {
      setCount(countRes.value ?? null);
    } else {
      setCount(null);
    }

    setLoading(false);
  }, [daysAhead, includeStable, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell
      active="profile"
      title="Уведомления"
      subtitle="Баланс, подписки, кредиты и зарплата — в одной ленте на выбранный период."
    >
      <ExtraScreensNav compact />

      {/* Фильтры */}
      <section className="mt-4 card p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="auth-field max-w-[200px]">
            <span className="text-xs">Горизонт, дней</span>
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-strong)]"
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
            >
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} дн.
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={includeStable}
              onChange={(e) => setIncludeStable(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--line)]"
            />
            Показывать «спокойные» (good)
          </label>
          <button
            type="button"
            className="action-btn ml-auto"
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? "Обновление…" : "Обновить"}
          </button>
        </div>
      </section>

      {/* Сводка по count */}
      {count != null && !loading && (
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Всего</p>
            <p className="mono mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{count.total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">Непрочитанных</p>
            <p className="mono mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{count.unread}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[#fff1f2] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9f1239]">Риск</p>
            <p className="mono mt-1 text-2xl font-semibold text-[#9f1239]">{count.by_severity?.risk ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[#fffbeb] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#b45309]">Внимание</p>
            <p className="mono mt-1 text-2xl font-semibold text-[#b45309]">{count.by_severity?.attention ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#166534]">Спокойно</p>
            <p className="mono mt-1 text-2xl font-semibold text-[#166534]">{count.by_severity?.good ?? 0}</p>
          </div>
        </section>
      )}

      {loading && items.length === 0 ? (
        <p className="metric-label mt-6">Загрузка…</p>
      ) : error ? (
        <div className="alert alert-warn mt-6">{error}</div>
      ) : items.length === 0 ? (
        <section className="mt-6 grid grid-cols-1 gap-3">
          <article className="card p-5 md:p-6">
            <p className="text-sm text-[var(--ink-muted)]">
              За выбранный период уведомлений нет. Измените горизонт или включите показ «спокойных» событий.
            </p>
          </article>
        </section>
      ) : (
        <section className="mt-6 grid grid-cols-1 gap-3">
          {items.map((n) => (
            <article
              key={n.id}
              className={`card p-4 md:p-5 ${severityBorder(n.severity)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
                    {SOURCE_LABEL[n.source] ?? n.source}
                  </span>
                  <span className={`text-xs ${severityBadge(n.severity)}`}>
                    {n.severity === "risk" ? "Риск" : n.severity === "attention" ? "Внимание" : "Ок"}
                  </span>
                  {n.status && (
                    <span className="text-xs text-[var(--ink-muted)]">· {n.status}</span>
                  )}
                </div>
                <div className="text-right text-xs text-[var(--ink-muted)]">
                  {n.type && <span className="mono">{n.type}</span>}
                </div>
              </div>
              <h3 className="mt-2 text-base font-semibold text-[var(--ink-strong)]">{n.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)] whitespace-pre-wrap">
                {n.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-muted)]">
                {n.date && (
                  <span>Дата: {formatNotificationDate(n.date)}</span>
                )}
                {n.days_left != null && (
                  <span className="mono">
                    {n.days_left === 0 ? "Сегодня" : `Через ${n.days_left} дн.`}
                  </span>
                )}
              </div>
              {n.meta && Object.keys(n.meta).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[var(--ink-muted)]">Доп. данные</summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-[var(--surface-2)] p-2 text-[10px] text-[var(--ink-soft)]">
                    {JSON.stringify(n.meta, null, 2)}
                  </pre>
                </details>
              )}
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
