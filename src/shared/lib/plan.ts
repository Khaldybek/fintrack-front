import type { PlanFeatures, PlanLimits, PlanResponse, PlanSlug } from "@/shared/api";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  pro_monthly: "Pro (месяц)",
  pro_yearly: "Pro (год)",
  family_monthly: "Family (месяц)",
  family_yearly: "Family (год)",
};

export function formatPlanLabel(plan: PlanSlug | string): string {
  return PLAN_LABELS[plan] ?? String(plan);
}

const DEFAULT_FREE_LIMITS: PlanLimits = {
  accounts: 2,
  budgets: 1,
  goals: 1,
};

const DEFAULT_FEATURES: PlanFeatures = {
  dashboardIndex: false,
  forecast: true,
  familyMode: false,
};

/** Нормализует ответ GET /me/plan — бэк после оплаты может не отдать features/limits. */
export function normalizePlanResponse(data: PlanResponse): PlanResponse {
  const slug = (data.plan ?? "free") as PlanSlug;
  const paid = slug !== "free";

  return {
    ...data,
    plan: slug,
    limits: data.limits
      ? {
          accounts: data.limits.accounts ?? null,
          budgets: data.limits.budgets ?? null,
          goals: data.limits.goals ?? null,
        }
      : paid
        ? { accounts: null, budgets: null, goals: null }
        : DEFAULT_FREE_LIMITS,
    features: data.features
      ? {
          dashboardIndex: Boolean(data.features.dashboardIndex),
          forecast: data.features.forecast !== false,
          familyMode: Boolean(data.features.familyMode),
        }
      : paid
        ? {
            dashboardIndex: true,
            forecast: true,
            familyMode:
              slug === "family_monthly" || slug === "family_yearly",
          }
        : DEFAULT_FEATURES,
    subscription: data.subscription ?? null,
  };
}

export function isAtLimit(count: number, limit: number | null | undefined): boolean {
  if (limit == null) return false;
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

export function formatLimitValue(limit: number | null | undefined): string {
  if (limit === null) return "безлимит";
  if (limit === undefined) return "—";
  return String(limit);
}

export function formatMoneyMinor(amountMinor: number, currency = "KZT"): string {
  const formatted = amountMinor
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "KZT" ? `${formatted} ₸` : `${formatted} ${currency}`;
}
