"use client";

import { useEffect, useState } from "react";
import { usePlan } from "@/app/providers/plan-provider";
import { getHousehold } from "@/shared/api";

/** Family + членство в household — можно включать sharedWithHousehold */
export function useCanShareAccountWithHousehold(): {
  canShare: boolean;
  loading: boolean;
} {
  const { plan } = usePlan();
  const familyMode = plan?.features?.familyMode ?? false;
  const [hasHousehold, setHasHousehold] = useState(false);
  const [loading, setLoading] = useState(familyMode);

  useEffect(() => {
    if (!familyMode) {
      setHasHousehold(false);
      setLoading(false);
      return;
    }
    getHousehold()
      .then((h) => setHasHousehold(Boolean(h?.id)))
      .catch(() => setHasHousehold(false))
      .finally(() => setLoading(false));
  }, [familyMode]);

  return { canShare: familyMode && hasHousehold, loading };
}
