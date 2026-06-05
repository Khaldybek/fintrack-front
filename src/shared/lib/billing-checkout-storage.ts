import type { BillingCheckoutSession } from "@/shared/api";

const PREFIX = "fintrack_checkout_";

export function saveCheckoutSession(session: BillingCheckoutSession): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      `${PREFIX}${session.sessionId}`,
      JSON.stringify(session),
    );
  } catch {
    // ignore
  }
}

export function loadCheckoutSession(
  sessionId: string,
): BillingCheckoutSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BillingCheckoutSession;
  } catch {
    return null;
  }
}

export function clearCheckoutSession(sessionId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(`${PREFIX}${sessionId}`);
  } catch {
    // ignore
  }
}
