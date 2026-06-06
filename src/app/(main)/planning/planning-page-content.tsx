"use client";

import { useState } from "react";
import { AppShell } from "@/widgets/app-shell";
import { BudgetsSection } from "@/app/(main)/budgets/budgets-page-content";
import { GoalsSection } from "@/app/(main)/goals/goals-page-content";
import { useI18n } from "@/shared/i18n";

type TabId = "budgets" | "goals";

export function PlanningPageContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("budgets");

  const tabs: { id: TabId; label: string }[] = [
    { id: "budgets", label: t("planning.budgets") },
    { id: "goals", label: t("planning.goals") },
  ];

  return (
    <AppShell
      active="planning"
      title={t("planning.title")}
      subtitle={t("planning.subtitle")}
      eyebrow={t("planning.eyebrow")}
    >
      <nav
        aria-label={t("planning.tabsLabel")}
        className="mb-5 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white"
                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[var(--surface-3)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "budgets" && <BudgetsSection />}
      {activeTab === "goals" && <GoalsSection />}
    </AppShell>
  );
}
