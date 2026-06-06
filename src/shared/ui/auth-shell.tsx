"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";

export type AuthShellProps = {
  title: string;
  subtitle: string;
  helperText: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  helperText,
  children,
}: AuthShellProps) {
  const { t } = useI18n();

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <main className="mx-auto flex min-h-screen w-full max-w-[1080px] items-center px-4 py-8 md:px-6">
        <section className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
          <article className="card auth-brand fade-up hidden p-7 lg:block">
            <p className="mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              FinTrack Access
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink-strong)]">
              {t("shell.brandTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              {helperText}
            </p>
            <div className="mt-8 space-y-3">
              <div className="alert">{t("shell.brandFeature1")}</div>
              <div className="alert">{t("shell.brandFeature2")}</div>
              <div className="alert">{t("shell.brandFeature3")}</div>
            </div>
          </article>

          <article className="card fade-up p-5 md:p-7 [animation-delay:80ms]">
            <div className="mb-5">
              <Link
                className="mono text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]"
                href={ROUTES.home}
              >
                FinTrack
              </Link>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink-strong)]">
                {title}
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{subtitle}</p>
            </div>
            {children}
          </article>
        </section>
      </main>
    </div>
  );
}
