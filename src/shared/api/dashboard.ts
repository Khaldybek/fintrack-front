/**
 * API дашборда (/v1/dashboard):
 * - GET    /dashboard/summary          — сводка
 * - GET    /dashboard/forecast        — прогноз (AI)
 * - GET    /dashboard/alerts         — алерты (минус баланс, низкий остаток, зарплата и т.д.)
 * - GET    /dashboard/insight        — инсайт дня (AI)
 * - GET    /dashboard/index          — финансовый индекс 0–100 и факторы
 * - GET    /dashboard/salary-schedules     — расписание зарплат
 * - POST   /dashboard/salary-schedules     — добавить (body: dayOfMonth, label)
 * - DELETE /dashboard/salary-schedules/:id — удалить
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

/** GET /v1/dashboard/index — финансовый индекс 0–100 и факторы. */
export async function getDashboardIndex(): Promise<DashboardIndex> {
  return apiClient<DashboardIndex>("/dashboard/index");
}

/** GET /v1/dashboard/summary — сводка: баланс, доход/расход за месяц, валюта, month.dateFrom/dateTo, timezone_hint. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>("/dashboard/summary");
}

/** GET /v1/dashboard/forecast — прогноз: balance, projected_balance, days_left, status, severity, explanation, explanationAi (опц.). */
export async function getDashboardForecast(): Promise<DashboardForecast> {
  return apiClient<DashboardForecast>("/dashboard/forecast");
}

/** GET /v1/dashboard/alerts — алерты (минус баланс, низкий остаток, зарплата и т.д.). */
export async function getDashboardAlerts(): Promise<DashboardAlertsResponse> {
  return apiClient<DashboardAlertsResponse>("/dashboard/alerts");
}

/** GET /v1/dashboard/insight — инсайт дня (AI), кеш ~6 ч. Ответ: text, severity, status. */
export async function getDashboardInsight(): Promise<DashboardInsight> {
  return apiClient<DashboardInsight>("/dashboard/insight");
}

/** GET /v1/dashboard/salary-schedules — расписание зарплат. */
export async function getSalarySchedules(): Promise<SalarySchedule[]> {
  return apiClient<SalarySchedule[]>("/dashboard/salary-schedules");
}

/** POST /v1/dashboard/salary-schedules — добавить (body: dayOfMonth, label). */
export async function createSalarySchedule(
  body: CreateSalaryScheduleBody,
): Promise<SalarySchedule> {
  return apiClient<SalarySchedule>("/dashboard/salary-schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** DELETE /v1/dashboard/salary-schedules/:id — удалить. */
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
