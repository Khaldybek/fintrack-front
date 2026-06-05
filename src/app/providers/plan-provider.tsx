"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMePlan, type PlanResponse } from "@/shared/api";
import { isAtLimit, isFamilyPlan, isPaidPlan } from "@/shared/lib/plan";
import { useAuth } from "./auth-provider";

type PlanContextValue = {
  plan: PlanResponse | null;
  isLoading: boolean;
  refreshPlan: () => Promise<void>;
  isPaid: boolean;
  isFamily: boolean;
  canAddAccount: (count: number) => boolean;
  canAddBudget: (count: number) => boolean;
  canAddGoal: (count: number) => boolean;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPlan = useCallback(async () => {
    if (!isAuthenticated) {
      setPlan(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getMePlan();
      setPlan(data);
    } catch {
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setPlan(null);
      return;
    }
    void refreshPlan();
  }, [authLoading, isAuthenticated, refreshPlan]);

  const value = useMemo<PlanContextValue>(() => {
    const slug = plan?.plan ?? "free";
    const limits = plan?.limits;
    return {
      plan,
      isLoading: authLoading || isLoading,
      refreshPlan,
      isPaid: isPaidPlan(slug),
      isFamily: isFamilyPlan(slug),
      canAddAccount: (count) =>
        limits ? !isAtLimit(count, limits.accounts) : true,
      canAddBudget: (count) =>
        limits ? !isAtLimit(count, limits.budgets) : true,
      canAddGoal: (count) =>
        limits ? !isAtLimit(count, limits.goals) : true,
    };
  }, [plan, authLoading, isLoading, refreshPlan]);

  return (
    <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
