"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Ellipsis,
  LayoutDashboard,
  PieChart,
  Target,
  User,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useAccountsNav } from "@/app/(main)/accounts-nav-context";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";

export type NavKey =
  | "dashboard"
  | "transactions"
  | "analytics"
  | "planning"
  | "budgets"
  | "goals"
  | "profile";

const NAV_ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  transactions: ArrowLeftRight,
  analytics: BarChart3,
  planning: Target,
  profile: User,
  budgets: PieChart,
  goals: Target,
};

const navIconProps = {
  className: "h-3.5 w-3.5 shrink-0 md:h-4 md:w-4",
  strokeWidth: 2,
  "aria-hidden": true as const,
};

export type AppShellProps = {
  active: NavKey;
  title: string;
  subtitle: string;
  eyebrow?: string;
  /** Текст кнопки в шапке */
  actionLabel?: string;
  /** Кастомная кнопка/элемент вместо actionLabel (например, открывает модалку) */
  actionAs?: ReactNode;
  children: ReactNode;
};

const navKeys: { key: NavKey; href: string; tKey: string }[] = [
  { key: "dashboard", href: ROUTES.home, tKey: "nav.dashboard" },
  { key: "transactions", href: ROUTES.transactions, tKey: "nav.transactions" },
  { key: "analytics", href: ROUTES.analytics, tKey: "nav.analytics" },
  { key: "planning", href: ROUTES.planning, tKey: "nav.planning" },
  { key: "profile", href: ROUTES.profile, tKey: "nav.profile" },
];

export function AppShell({
  active,
  title,
  subtitle,
  eyebrow = "FinTrack",
  actionLabel,
  actionAs,
  children,
}: AppShellProps) {
  const { t } = useI18n();
  const { hasAccounts } = useAccountsNav();
  const navItems = useMemo(() => {
    const keys =
      hasAccounts === false
        ? navKeys.filter((n) => n.key !== "analytics")
        : navKeys;
    return keys.map((n) => ({ ...n, label: t(n.tKey) }));
  }, [t, hasAccounts]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const mobilePrimary = navItems.filter((item) =>
    ["dashboard", "transactions", "analytics", "profile"].includes(item.key),
  );
  const mobileSecondary = navItems.filter((item) =>
    ["planning"].includes(item.key),
  );
  const isMoreActive = active === "planning";

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <main className="mx-auto flex min-h-screen w-full max-w-[1280px] px-4 pb-24 pt-5 md:px-6 md:pb-10">
        <div className="flex w-full flex-col gap-5">
          <header className="card fade-up p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-[var(--ink-strong)] md:text-[1.72rem]">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  {subtitle}
                </p>
              </div>
              {actionAs ??
                (actionLabel ? (
                  <button className="action-btn" type="button">
                    {actionLabel}
                  </button>
                ) : null)}
            </div>

            <nav className="tablet-nav mt-5 hidden gap-2 md:flex">
              {navItems.map((item) => {
                const Icon = NAV_ICONS[item.key];
                return (
                  <Link
                    key={item.key}
                    className={`desktop-tab inline-flex items-center gap-1.5 ${item.key === active ? "active" : ""}`}
                    href={item.href}
                  >
                    <Icon {...navIconProps} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </header>

          {children}
        </div>
      </main>

      <nav className="mobile-nav md:hidden">
        {mobilePrimary.map((item) => {
          const Icon = NAV_ICONS[item.key];
          return (
            <Link
              key={item.key}
              className={`mobile-tab flex flex-col items-center gap-0.5 ${item.key === active ? "active" : ""}`}
              href={item.href}
              onClick={() => setIsMoreMenuOpen(false)}
            >
              <Icon {...navIconProps} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          className={`mobile-tab flex flex-col items-center gap-0.5 ${isMoreActive || isMoreMenuOpen ? "active" : ""}`}
          onClick={() => setIsMoreMenuOpen((prev) => !prev)}
          type="button"
        >
          <Ellipsis {...navIconProps} />
          <span>{t("shell.more")}</span>
        </button>
      </nav>

      {isMoreMenuOpen ? (
        <div className="mobile-more-menu md:hidden">
          {mobileSecondary.map((item) => {
            const Icon = NAV_ICONS[item.key];
            return (
              <Link
                key={item.key}
                className={`mobile-more-item inline-flex items-center gap-2 ${item.key === active ? "active" : ""}`}
                href={item.href}
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <Icon {...navIconProps} className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
