"use client";

import { useState } from "react";
import { AppShell } from "@/widgets/app-shell";
import { BudgetsSection } from "@/app/(main)/budgets/budgets-page-content";
import { GoalsSection } from "@/app/(main)/goals/goals-page-content";

type TabId = "budgets" | "goals";

const TABS: { id: TabId; label: string }[] = [
  { id: "budgets", label: "Бюджеты" },
  { id: "goals", label: "Цели" },
];

export function PlanningPageContent() {
  const [activeTab, setActiveTab] = useState<TabId>("budgets");

  return (
    <AppShell
      active="planning"
      title="Бюджеты и цели"
      subtitle="Лимиты по категориям и финансовые цели накопления в одном месте."
      eyebrow="FinTrack Планирование"
    >
      <nav
        aria-label="Разделы планирования"
        className="mb-5 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
      >
        {TABS.map((tab) => (
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
