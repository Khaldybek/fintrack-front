/**
 * API профиля и плана: GET/PATCH /v1/me, GET /v1/me/plan
 */
import { apiClient } from "./client";
import type { Profile, PatchMeBody, PlanResponse } from "./types";

export async function getMe(): Promise<Profile> {
  return apiClient<Profile>("/me");
}

export async function patchMe(body: PatchMeBody): Promise<Profile> {
  return apiClient<Profile>("/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function getMePlan(): Promise<PlanResponse> {
  return apiClient<PlanResponse>("/me/plan");
}
