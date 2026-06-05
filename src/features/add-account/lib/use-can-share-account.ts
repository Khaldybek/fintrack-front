"use client";

import { usePlan } from "@/app/providers/plan-provider";
import { hasEffectiveFamilyMode } from "@/shared/lib/plan";

/** Family (подписка или членство) + household — можно включать sharedWithHousehold */
export function useCanShareAccountWithHousehold(): {
  canShare: boolean;
  loading: boolean;
} {
  const { plan, isLoading } = usePlan();
  const familyMode = hasEffectiveFamilyMode(plan);
  const hasHousehold = plan?.household != null;

  return {
    canShare: familyMode && hasHousehold,
    loading: isLoading,
  };
}
