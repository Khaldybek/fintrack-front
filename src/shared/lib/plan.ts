import type { PlanSlug } from "@/shared/api";

const PLAN_LABELS: Record<PlanSlug, string> = {
  free: "Free",
  pro_monthly: "Pro (месяц)",
  pro_yearly: "Pro (год)",
  family_monthly: "Family (месяц)",
  family_yearly: "Family (год)",
};

export function formatPlanLabel(plan: PlanSlug): string {
  return PLAN_LABELS[plan] ?? plan;
}

export function isAtLimit(count: number, limit: number | null): boolean {
  if (limit === null) return false;
  return count >= limit;
}

export function isPaidPlan(plan: PlanSlug): boolean {
  return plan !== "free";
}

export function isFamilyPlan(plan: PlanSlug): boolean {
  return plan === "family_monthly" || plan === "family_yearly";
}

export function isProPlan(plan: PlanSlug): boolean {
  return (
    plan === "pro_monthly" ||
    plan === "pro_yearly" ||
    plan === "family_monthly" ||
    plan === "family_yearly"
  );
}

export function formatLimitValue(limit: number | null): string {
  return limit === null ? "безлимит" : String(limit);
}

export function formatMoneyMinor(amountMinor: number, currency = "KZT"): string {
  const formatted = amountMinor
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "KZT" ? `${formatted} ₸` : `${formatted} ${currency}`;
}
