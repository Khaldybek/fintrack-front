/**
 * API бюджетов: GET/POST /v1/budgets, GET/PATCH/DELETE /v1/budgets/:id
 */
import { apiClient } from "./client";
import type {
  Budget,
  CreateBudgetBody,
  UpdateBudgetBody,
  DeleteBudgetResponse,
} from "./types";

export async function getBudgets(): Promise<Budget[]> {
  return apiClient<Budget[]>("/budgets");
}

export async function getBudget(id: string): Promise<Budget> {
  return apiClient<Budget>(`/budgets/${encodeURIComponent(id)}`);
}

export async function createBudget(body: CreateBudgetBody): Promise<Budget> {
  return apiClient<Budget>("/budgets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBudget(
  id: string,
  body: UpdateBudgetBody,
): Promise<Budget> {
  return apiClient<Budget>(`/budgets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteBudget(id: string): Promise<DeleteBudgetResponse> {
  return apiClient<DeleteBudgetResponse>(`/budgets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
