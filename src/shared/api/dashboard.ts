/**
 * API дашборда: summary, forecast, alerts, insight, salary-schedules, index
 */
import { apiClient } from "./client";
import type {
  DashboardSummary,
  DashboardForecast,
  DashboardAlertsResponse,
  DashboardInsight,
  DashboardIndex,
  SalarySchedule,
  CreateSalaryScheduleBody,
  DeleteSalaryScheduleResponse,
} from "./types";

/** GET /v1/dashboard/index — финансовый индекс (Pro) */
export async function getDashboardIndex(): Promise<DashboardIndex> {
  return apiClient<DashboardIndex>("/dashboard/index");
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>("/dashboard/summary");
}

export async function getDashboardForecast(): Promise<DashboardForecast> {
  return apiClient<DashboardForecast>("/dashboard/forecast");
}

export async function getDashboardAlerts(): Promise<DashboardAlertsResponse> {
  return apiClient<DashboardAlertsResponse>("/dashboard/alerts");
}

export async function getDashboardInsight(): Promise<DashboardInsight> {
  return apiClient<DashboardInsight>("/dashboard/insight");
}

export async function getSalarySchedules(): Promise<SalarySchedule[]> {
  return apiClient<SalarySchedule[]>("/dashboard/salary-schedules");
}

export async function createSalarySchedule(
  body: CreateSalaryScheduleBody,
): Promise<SalarySchedule> {
  return apiClient<SalarySchedule>("/dashboard/salary-schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteSalarySchedule(
  id: string,
): Promise<DeleteSalaryScheduleResponse> {
  return apiClient<DeleteSalaryScheduleResponse>(
    `/dashboard/salary-schedules/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}
