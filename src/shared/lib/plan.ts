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

function normalizeFeatures(
  raw: Partial<PlanFeatures> | undefined,
  fallback: PlanFeatures,
): PlanFeatures {
  if (!raw) return fallback;
  return {
    dashboardIndex: Boolean(raw.dashboardIndex),
    forecast: raw.forecast !== false,
    familyMode: Boolean(raw.familyMode),
  };
}

function normalizeHouseholdSummary(
  raw: PlanResponse["household"],
): PlanResponse["household"] {
  if (!raw || typeof raw !== "object") return raw ?? null;
  const o = raw as unknown as Record<string, unknown>;
  const role = o.role;
  const validRole =
    role === "owner" || role === "member" || role === "viewer" ? role : "member";
  return {
    id: String(o.id ?? ""),
    name: String(o.name ?? ""),
    role: validRole,
    isOwner: Boolean(o.isOwner ?? o.is_owner),
  };
}

/** Нормализует ответ GET /me/plan — бэк после оплаты может не отдать features/limits. */
export function normalizePlanResponse(data: PlanResponse): PlanResponse {
  const slug = (data.plan ?? "free") as PlanSlug;
  const paid = slug !== "free";

  const subscriptionFeatures: PlanFeatures = paid
    ? {
        dashboardIndex: true,
        forecast: true,
        familyMode: slug === "family_monthly" || slug === "family_yearly",
      }
    : DEFAULT_FEATURES;

  const features = normalizeFeatures(data.features, subscriptionFeatures);

  const featuresEffective = normalizeFeatures(
    data.featuresEffective,
    features,
  );

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
    features,
    featuresEffective,
    familyModeSource: data.familyModeSource ?? null,
    household: normalizeHouseholdSummary(data.household),
    householdOwnerPlan: data.householdOwnerPlan ?? null,
    subscription: data.subscription ?? null,
  };
}

/** Фичи для гейтинга и «Семейный режим: да/нет» в UI */
export function getEffectiveFeatures(plan: PlanResponse | null): PlanFeatures {
  if (!plan) return DEFAULT_FEATURES;
  return plan.featuresEffective ?? plan.features ?? DEFAULT_FEATURES;
}

export function hasEffectiveFamilyMode(plan: PlanResponse | null): boolean {
  return getEffectiveFeatures(plan).familyMode;
}

/** Участник чужой семьи без своей подписки Family */
export function isHouseholdMemberOnFree(plan: PlanResponse | null): boolean {
  return plan?.plan === "free" && plan.household != null;
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
