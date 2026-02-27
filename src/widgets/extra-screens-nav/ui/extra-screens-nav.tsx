"use client";

import Link from "next/link";
import { ROUTES } from "@/shared/config";

export type ExtraKey =
  | "cashflow"
  | "subscriptions"
  | "family"
  | "security"
  | "credits"
  | "categories";

export type ExtraScreensNavProps = {
  active?: ExtraKey;
  compact?: boolean;
};

const items: { key: ExtraKey; label: string; desc: string; href: string }[] = [
  {
    key: "cashflow",
    label: "Прогноз разрыва",
    desc: "Контроль ликвидности до зарплаты",
    href: ROUTES.cashflow,
  },
  {
    key: "subscriptions",
    label: "Подписки",
    desc: "Регулярные платежи и автосписания",
    href: ROUTES.subscriptions,
  },
  {
    key: "family",
    label: "Семейный режим",
    desc: "Общий бюджет и роли доступа",
    href: ROUTES.family,
  },
  {
    key: "security",
    label: "Безопасность",
    desc: "Сессии, 2FA и контроль входов",
    href: ROUTES.security,
  },
  {
    key: "credits",
    label: "Кредиты",
    desc: "Долговая нагрузка и дата свободы",
    href: ROUTES.creditCalculator,
  },
  {
    key: "categories",
    label: "Категории",
    desc: "Управление категориями доходов и расходов",
    href: ROUTES.categories,
  },
];

export function ExtraScreensNav({
  active,
  compact = false,
}: ExtraScreensNavProps) {
  return (
    <section className={`card ${compact ? "p-4 md:p-5" : "p-5 md:p-6"}`}>
      <div className="extra-nav-head">
        <p className="metric-label">Навигация по разделам</p>
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Дополнительные экраны
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Нажмите на нужный раздел, чтобы быстро перейти между сервисными
          экранами.
        </p>
      </div>

      <nav
        aria-label="Навигация по дополнительным экранам"
        className={`extra-tabbar ${compact ? "compact" : ""}`}
      >
        {items.map((item) => (
          <Link
            key={item.key}
            className={`extra-tab ${item.key === active ? "active" : ""}`}
            href={item.href}
          >
            <div>
              <p className="extra-tab-title">{item.label}</p>
              <p className="extra-tab-desc">{item.desc}</p>
            </div>
            <span className="extra-tab-arrow">→</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
