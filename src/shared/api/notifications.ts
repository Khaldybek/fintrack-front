/**
 * Уведомления: GET /v1/notifications, GET /v1/notifications/count
 */
import { apiClient } from "./client";
import type {
  NotificationsResponse,
  GetNotificationsQuery,
  NotificationsCountResponse,
  GetNotificationsCountQuery,
} from "./types";

/** GET /v1/notifications — объединённый список */
export async function getNotifications(
  query?: GetNotificationsQuery,
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (query?.daysAhead != null) params.set("daysAhead", String(query.daysAhead));
  if (query?.limit != null) params.set("limit", String(query.limit));
  if (query?.includeStable != null) params.set("includeStable", String(query.includeStable));
  const qs = params.toString();
  return apiClient<NotificationsResponse>(qs ? `/notifications?${qs}` : "/notifications");
}

/** GET /v1/notifications/count — счётчики */
export async function getNotificationsCount(
  query?: GetNotificationsCountQuery,
): Promise<NotificationsCountResponse> {
  const params = new URLSearchParams();
  if (query?.daysAhead != null) params.set("daysAhead", String(query.daysAhead));
  const qs = params.toString();
  return apiClient<NotificationsCountResponse>(
    qs ? `/notifications/count?${qs}` : "/notifications/count",
  );
}
