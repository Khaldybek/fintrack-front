"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";
import { getSecuritySessions, getSecurityEvents } from "@/shared/api";
import type { SecuritySession, SecurityEvent } from "@/shared/api";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-KZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(event: SecurityEvent): string {
  const type = event.type ?? "";
  if (type.includes("login")) return "Вход в аккаунт";
  if (type.includes("logout")) return "Выход из аккаунта";
  if (type.includes("password")) return "Изменение пароля";
  if (type.includes("session")) return "Действие с сессией";
  return type || "Событие";
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getSecuritySessions().catch(() => [] as SecuritySession[]),
      getSecurityEvents(10).catch(() => [] as SecurityEvent[]),
    ])
      .then(([s, e]) => {
        setSessions(s ?? []);
        setEvents(e ?? []);
      })
      .catch((err) => setError(err?.message ?? "Не удалось загрузить данные безопасности"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      active="profile"
      title="Безопасность"
      subtitle="Проверка сессий, контроль входов и защита финансовых данных."
    >
      <ExtraScreensNav active="security" compact />

      {loading ? (
        <p className="metric-label">Загрузка…</p>
      ) : error ? (
        <div className="alert alert-warn">{error}</div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              Активные сессии
            </h2>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">Нет активных сессий.</p>
              ) : (
                sessions.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--ink-strong)]">
                        Сессия
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        Создана: {formatDate(item.createdAt)} · Истекает: {formatDate(item.expiresAt)}
                      </p>
                    </div>
                    <span className="budget-pill normal">Активна</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <aside className="flex flex-col gap-5">
            {events.length > 0 && (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                  Последние события
                </h2>
                <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
                  {events.map((e) => (
                    <p key={e.id}>
                      {formatDate(e.createdAt)} · {eventLabel(e)}
                    </p>
                  ))}
                </div>
              </article>
            )}
          </aside>
        </section>
      )}
    </AppShell>
  );
}
