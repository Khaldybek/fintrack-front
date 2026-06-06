"use client";

import { useEffect, useState } from "react";
import { getSecuritySessions, getSecurityEvents } from "@/shared/api";
import type { SecuritySession, SecurityEvent } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatDateLocale } from "@/shared/lib/format-locale";
import { AppShell } from "@/widgets/app-shell";
import { ExtraScreensNav } from "@/widgets/extra-screens-nav";

export default function SecurityPage() {
  const { t, locale } = useI18n();
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (iso: string) =>
    formatDateLocale(iso, locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const eventLabel = (event: SecurityEvent): string => {
    const type = event.type ?? "";
    if (type.includes("login")) return t("security.eventLogin");
    if (type.includes("logout")) return t("security.eventLogout");
    if (type.includes("password")) return t("security.eventPassword");
    if (type.includes("session")) return t("security.eventSession");
    return type || t("security.eventGeneric");
  };

  useEffect(() => {
    Promise.all([
      getSecuritySessions().catch(() => [] as SecuritySession[]),
      getSecurityEvents(10).catch(() => [] as SecurityEvent[]),
    ])
      .then(([s, e]) => {
        setSessions(s ?? []);
        setEvents(e ?? []);
      })
      .catch((err) => setError(err?.message ?? t("security.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <AppShell
      active="profile"
      title={t("security.title")}
      subtitle={t("security.subtitle")}
    >
      <ExtraScreensNav active="security" compact />

      {loading ? (
        <p className="metric-label">{t("common.loading")}</p>
      ) : error ? (
        <div className="alert alert-warn">{error}</div>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
          <article className="card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("security.sessions")}
            </h2>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">{t("security.noSessions")}</p>
              ) : (
                sessions.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--ink-strong)]">
                        {t("security.session")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {t("security.sessionCreated").replace("{date}", formatDate(item.createdAt))}
                        {" · "}
                        {t("security.sessionExpires").replace("{date}", formatDate(item.expiresAt))}
                      </p>
                    </div>
                    <span className="budget-pill normal">{t("security.sessionActive")}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <aside className="flex flex-col gap-5">
            {events.length > 0 && (
              <article className="card p-5">
                <h2 className="text-base font-semibold text-[var(--ink-strong)]">
                  {t("security.events")}
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
