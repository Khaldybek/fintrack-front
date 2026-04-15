"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  ChevronRight,
  CreditCard,
  Shield,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ROUTES } from "@/shared/config";
import { useI18n } from "@/shared/i18n";

export type ExtraKey =
  | "cashflow"
  | "subscriptions"
  | "family"
  | "security"
  | "credits"
  | "categories";

const EXTRA_ICONS: Record<ExtraKey, LucideIcon> = {
  cashflow: Wallet,
  subscriptions: CreditCard,
  family: Users,
  security: Shield,
  credits: Calculator,
  categories: Tags,
};

const extraIconProps = {
  className: "extra-tab-lead-icon h-5 w-5 shrink-0 text-[var(--ink-muted)]",
  strokeWidth: 2,
  "aria-hidden": true as const,
};

export type ExtraScreensNavProps = {
  active?: ExtraKey;
  compact?: boolean;
};

const itemDefs: { key: ExtraKey; href: string }[] = [
  { key: "cashflow", href: ROUTES.cashflow },
  { key: "subscriptions", href: ROUTES.subscriptions },
  { key: "family", href: ROUTES.family },
  { key: "security", href: ROUTES.security },
  { key: "credits", href: ROUTES.creditCalculator },
  { key: "categories", href: ROUTES.categories },
];

export function ExtraScreensNav({
  active,
  compact = false,
}: ExtraScreensNavProps) {
  const { t } = useI18n();
  const items = useMemo(
    () =>
      itemDefs.map((def) => ({
        ...def,
        label: t(`extraNav.items.${def.key}.label`),
        desc: t(`extraNav.items.${def.key}.desc`),
      })),
    [t],
  );

  return (
    <section className={`card ${compact ? "p-4 md:p-5" : "p-5 md:p-6"}`}>
      <div className="extra-nav-head">
        <p className="metric-label">{t("extraNav.sectionLabel")}</p>
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          {t("extraNav.sectionTitle")}
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">
          {t("extraNav.sectionDesc")}
        </p>
      </div>

      <nav
        aria-label={t("extraNav.sectionTitle")}
        className={`extra-tabbar ${compact ? "compact" : ""}`}
      >
        {items.map((item) => {
          const Icon = EXTRA_ICONS[item.key];
          return (
            <Link
              key={item.key}
              className={`extra-tab ${item.key === active ? "active" : ""}`}
              href={item.href}
            >
              <Icon {...extraIconProps} />
              <div className="min-w-0 flex-1">
                <p className="extra-tab-title">{item.label}</p>
                <p className="extra-tab-desc">{item.desc}</p>
              </div>
              <span
                className="extra-tab-arrow inline-flex shrink-0"
                aria-hidden
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
