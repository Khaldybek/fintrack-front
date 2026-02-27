/**
 * API кредитов: GET/POST /v1/credits, GET/PATCH/DELETE /v1/credits/:id, summary, simulate-prepayment
 */
import { apiClient } from "./client";
import type {
  Credit,
  CreditsSummaryResponse,
  CreditsRemindersResponse,
  CreateCreditBody,
  UpdateCreditBody,
  DeleteCreditResponse,
  SimulatePrepaymentBody,
  SimulatePrepaymentResponse,
} from "./types";

export async function getCredits(): Promise<Credit[]> {
  return apiClient<Credit[]>("/credits");
}

export async function getCreditsSummary(
  monthlyIncomeMinor?: number,
): Promise<CreditsSummaryResponse> {
  const path =
    monthlyIncomeMinor != null
      ? `/credits/summary?monthlyIncomeMinor=${monthlyIncomeMinor}`
      : "/credits/summary";
  return apiClient<CreditsSummaryResponse>(path);
}

export async function getCreditsReminders(
  daysAhead = 14,
): Promise<CreditsRemindersResponse> {
  const path = `/credits/reminders?daysAhead=${daysAhead}`;
  return apiClient<CreditsRemindersResponse>(path);
}

export async function getCredit(id: string): Promise<Credit> {
  return apiClient<Credit>(`/credits/${encodeURIComponent(id)}`);
}

export async function createCredit(body: CreateCreditBody): Promise<Credit> {
  return apiClient<Credit>("/credits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCredit(
  id: string,
  body: UpdateCreditBody,
): Promise<Credit> {
  return apiClient<Credit>(`/credits/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCredit(id: string): Promise<DeleteCreditResponse> {
  return apiClient<DeleteCreditResponse>(`/credits/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function simulatePrepayment(
  body: SimulatePrepaymentBody,
): Promise<SimulatePrepaymentResponse> {
  return apiClient<SimulatePrepaymentResponse>(
    "/credits/simulate-prepayment",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
