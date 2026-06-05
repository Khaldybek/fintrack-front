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
  BillingInvoice,
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

function normalizeBillingInvoices(raw: unknown): BillingInvoice[] {
  if (Array.isArray(raw)) return raw as BillingInvoice[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.invoices)) return obj.invoices as BillingInvoice[];
    if (Array.isArray(obj.items)) return obj.items as BillingInvoice[];
    if (obj.data && typeof obj.data === "object") {
      const data = obj.data as Record<string, unknown>;
      if (Array.isArray(data.invoices)) return data.invoices as BillingInvoice[];
    }
  }
  return [];
}

/** GET /v1/billing/invoices — история платежей */
export async function getBillingInvoices(
  limit = 20,
): Promise<BillingInvoicesResponse> {
  const raw = await apiClient<unknown>(
    `/billing/invoices?limit=${encodeURIComponent(String(limit))}`,
  );
  return { invoices: normalizeBillingInvoices(raw) };
}
