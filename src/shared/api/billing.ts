/**
 * API биллинга FinTrack (Pro / Family) — не путать с /v1/subscriptions (Netflix и т.д.)
 */
import { apiClient } from "./client";
import type {
  BillingCancelResponse,
  BillingCheckoutBody,
  BillingCheckoutConfirmBody,
  BillingCheckoutConfirmResponse,
  BillingCheckoutSession,
  BillingInvoicesResponse,
  BillingPlansResponse,
  PlanResponse,
} from "./types";

/** GET /v1/billing/plans — каталог (без JWT) */
export async function getBillingPlans(): Promise<BillingPlansResponse> {
  return apiClient<BillingPlansResponse>("/billing/plans");
}

/** GET /v1/billing/subscription — расширенный план + id подписки */
export async function getBillingSubscription(): Promise<PlanResponse> {
  return apiClient<PlanResponse>("/billing/subscription");
}

/** POST /v1/billing/checkout — сессия mock-оплаты */
export async function createBillingCheckout(
  body: BillingCheckoutBody,
): Promise<BillingCheckoutSession> {
  return apiClient<BillingCheckoutSession>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /v1/billing/checkout/:sessionId/confirm — mock-оплата */
export async function confirmBillingCheckout(
  sessionId: string,
  body?: BillingCheckoutConfirmBody,
): Promise<BillingCheckoutConfirmResponse> {
  return apiClient<BillingCheckoutConfirmResponse>(
    `/billing/checkout/${encodeURIComponent(sessionId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}

/** POST /v1/billing/cancel — отмена в конце периода */
export async function cancelBillingSubscription(): Promise<BillingCancelResponse> {
  return apiClient<BillingCancelResponse>("/billing/cancel", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** GET /v1/billing/invoices — история платежей */
export async function getBillingInvoices(
  limit = 20,
): Promise<BillingInvoicesResponse> {
  return apiClient<BillingInvoicesResponse>(
    `/billing/invoices?limit=${encodeURIComponent(String(limit))}`,
  );
}
