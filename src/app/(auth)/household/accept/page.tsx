import { Suspense } from "react";
import { HouseholdAcceptContent } from "@/features/household/ui/household-accept-content";

export default function HouseholdAcceptPage() {
  return (
    <Suspense fallback={null}>
      <HouseholdAcceptContent />
    </Suspense>
  );
}
