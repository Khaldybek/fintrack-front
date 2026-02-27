"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { ROUTES } from "@/shared/config";

export type NavKey =
  | "dashboard"
  | "transactions"
  | "analytics"
  | "budgets"
  | "goals"
  | "profile";

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

const navItems: { key: NavKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Главная", href: ROUTES.home },
  { key: "transactions", label: "Транзакции", href: ROUTES.transactions },
  { key: "analytics", label: "Аналитика", href: ROUTES.analytics },
  { key: "budgets", label: "Бюджеты", href: ROUTES.budgets },
  { key: "goals", label: "Цели", href: ROUTES.goals },
  { key: "profile", label: "Профиль", href: ROUTES.profile },
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const mobilePrimary = navItems.filter((item) =>
    ["dashboard", "transactions", "analytics", "profile"].includes(item.key),
  );
  const mobileSecondary = navItems.filter((item) =>
    ["budgets", "goals"].includes(item.key),
  );
  const isMoreActive = ["budgets", "goals"].includes(active);

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
              {actionAs ?? (actionLabel ? (
                <button className="action-btn" type="button">
                  {actionLabel}
                </button>
              ) : null)}
            </div>

            <nav className="tablet-nav mt-5 hidden gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  className={`desktop-tab ${item.key === active ? "active" : ""}`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          {children}
        </div>
      </main>

      <nav className="mobile-nav md:hidden">
        {mobilePrimary.map((item) => (
          <Link
            key={item.key}
            className={`mobile-tab ${item.key === active ? "active" : ""}`}
            href={item.href}
            onClick={() => setIsMoreMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <button
          className={`mobile-tab ${isMoreActive || isMoreMenuOpen ? "active" : ""}`}
          onClick={() => setIsMoreMenuOpen((prev) => !prev)}
          type="button"
        >
          Ещё
        </button>
      </nav>

      {isMoreMenuOpen ? (
        <div className="mobile-more-menu md:hidden">
          {mobileSecondary.map((item) => (
            <Link
              key={item.key}
              className={`mobile-more-item ${item.key === active ? "active" : ""}`}
              href={item.href}
              onClick={() => setIsMoreMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
