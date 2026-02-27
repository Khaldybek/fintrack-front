/**
 * API целей: GET/POST /v1/goals, GET/PATCH/DELETE /v1/goals/:id,
 * POST/GET /v1/goals/:id/entries, GET /v1/goals/:id/analytics
 */
import { apiClient } from "./client";
import type {
  Goal,
  CreateGoalBody,
  UpdateGoalBody,
  DeleteGoalResponse,
  GoalEntry,
  GoalEntriesResponse,
  GoalAnalyticsResponse,
  AddGoalEntryBody,
  AddGoalEntryResponse,
} from "./types";

export async function getGoals(): Promise<Goal[]> {
  return apiClient<Goal[]>("/goals");
}

export async function getGoal(id: string): Promise<Goal> {
  return apiClient<Goal>(`/goals/${encodeURIComponent(id)}`);
}

export async function createGoal(body: CreateGoalBody): Promise<Goal> {
  return apiClient<Goal>("/goals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateGoal(
  id: string,
  body: UpdateGoalBody,
): Promise<Goal> {
  return apiClient<Goal>(`/goals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteGoal(id: string): Promise<DeleteGoalResponse> {
  return apiClient<DeleteGoalResponse>(`/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function addGoalEntry(
  goalId: string,
  body: AddGoalEntryBody,
): Promise<AddGoalEntryResponse> {
  return apiClient<AddGoalEntryResponse>(
    `/goals/${encodeURIComponent(goalId)}/entries`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function getGoalEntries(
  goalId: string,
  page = 1,
  limit = 20,
): Promise<GoalEntriesResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiClient<GoalEntriesResponse>(
    `/goals/${encodeURIComponent(goalId)}/entries?${params}`,
  );
}

export async function getGoalAnalytics(
  goalId: string,
): Promise<GoalAnalyticsResponse> {
  return apiClient<GoalAnalyticsResponse>(
    `/goals/${encodeURIComponent(goalId)}/analytics`,
  );
}
