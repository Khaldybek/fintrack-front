/**
 * API безопасности: сессии и события
 */
import { apiClient } from "./client";
import type { SecuritySession, SecurityEvent } from "./types";

export async function getSecuritySessions(): Promise<SecuritySession[]> {
  return apiClient<SecuritySession[]>("/security/sessions");
}

/** DELETE /v1/security/sessions/:id — 204 или 200 без тела */
export async function deleteSecuritySession(id: string): Promise<void> {
  await apiClient<void>(
    `/security/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function getSecurityEvents(
  limit?: number,
): Promise<SecurityEvent[]> {
  const path =
    limit != null ? `/security/events?limit=${limit}` : "/security/events";
  return apiClient<SecurityEvent[]>(path);
}
