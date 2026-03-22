/**
 * API подписок:
 * GET/POST /v1/subscriptions, GET/PATCH /v1/subscriptions/:id
 * GET /v1/subscriptions/summary, GET /v1/subscriptions/reminders
 * POST /v1/subscriptions/:id/pay, DELETE /v1/subscriptions/:id
 */
import { apiClient } from "./client";
import type {
  Subscription,
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  SubscriptionsSummaryResponse,
  SubscriptionReminder,
  DeleteSubscriptionResponse,
} from "./types";

export async function getSubscriptions(): Promise<Subscription[]> {
  return apiClient<Subscription[]>("/subscriptions");
}

export async function getSubscription(id: string): Promise<Subscription> {
  return apiClient<Subscription>(`/subscriptions/${encodeURIComponent(id)}`);
}

export async function createSubscription(
  body: CreateSubscriptionBody,
): Promise<Subscription> {
  return apiClient<Subscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSubscription(
  id: string,
  body: UpdateSubscriptionBody,
): Promise<Subscription> {
  return apiClient<Subscription>(`/subscriptions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** GET /v1/subscriptions/summary — сводка: количество, скоро к оплате, оценка в месяц. */
export async function getSubscriptionsSummary(): Promise<SubscriptionsSummaryResponse> {
  return apiClient<SubscriptionsSummaryResponse>("/subscriptions/summary");
}

/** GET /v1/subscriptions/reminders?daysAhead= — подписки с ближайшими платежами, с days_until_payment. */
export async function getSubscriptionsReminders(
  daysAhead = 14,
): Promise<SubscriptionReminder[]> {
  const d = Math.max(1, Math.min(365, Math.floor(daysAhead)));
  const raw = await apiClient<
    SubscriptionReminder[] | { items?: SubscriptionReminder[] }
  >(`/subscriptions/reminders?daysAhead=${d}`);
  return Array.isArray(raw) ? raw : raw.items ?? [];
}

/** POST /v1/subscriptions/:id/pay — отметить оплату, сдвинуть nextPaymentDate на следующий цикл. */
export async function paySubscription(id: string): Promise<Subscription> {
  return apiClient<Subscription>(`/subscriptions/${encodeURIComponent(id)}/pay`, {
    method: "POST",
  });
}

/** DELETE /v1/subscriptions/:id — удалить подписку. */
export async function deleteSubscription(id: string): Promise<DeleteSubscriptionResponse> {
  return apiClient<DeleteSubscriptionResponse>(`/subscriptions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
