/**
 * API подписок: GET/POST /v1/subscriptions, GET/PATCH /v1/subscriptions/:id
 */
import { apiClient } from "./client";
import type {
  Subscription,
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
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
