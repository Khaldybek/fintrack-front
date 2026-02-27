/**
 * API аналитики: monthly, categories, trends, heatmap, anomalies, export
 */
import { apiClient } from "./client";
import type {
  AnalyticsMonthlyResponse,
  AnalyticsCategoriesQuery,
  AnalyticsCategoriesResponse,
  AnalyticsTrendsResponse,
  AnalyticsHeatmapResponse,
  AnalyticsAnomaliesResponse,
  MonthlyReportExportBody,
  MonthlyReportExportResponse,
} from "./types";

export async function getAnalyticsMonthly(
  year?: number,
): Promise<AnalyticsMonthlyResponse> {
  const path = year != null ? `/analytics/monthly?year=${year}` : "/analytics/monthly";
  return apiClient<AnalyticsMonthlyResponse>(path);
}

export async function getAnalyticsCategories(
  query?: AnalyticsCategoriesQuery,
): Promise<AnalyticsCategoriesResponse> {
  const search = new URLSearchParams();
  if (query?.dateFrom) search.set("dateFrom", query.dateFrom);
  if (query?.dateTo) search.set("dateTo", query.dateTo);
  const qs = search.toString();
  const path = qs ? `/analytics/categories?${qs}` : "/analytics/categories";
  return apiClient<AnalyticsCategoriesResponse>(path);
}

export async function getAnalyticsTrends(
  months?: number,
): Promise<AnalyticsTrendsResponse> {
  const path =
    months != null ? `/analytics/trends?months=${months}` : "/analytics/trends";
  return apiClient<AnalyticsTrendsResponse>(path);
}

export async function getAnalyticsHeatmap(): Promise<AnalyticsHeatmapResponse> {
  return apiClient<AnalyticsHeatmapResponse>("/analytics/heatmap");
}

export async function getAnalyticsAnomalies(): Promise<AnalyticsAnomaliesResponse> {
  return apiClient<AnalyticsAnomaliesResponse>("/analytics/anomalies");
}

/** POST /v1/analytics/monthly-report/export — экспорт месячного отчёта */
export async function exportMonthlyReport(
  body?: MonthlyReportExportBody,
): Promise<MonthlyReportExportResponse> {
  return apiClient<MonthlyReportExportResponse>(
    "/analytics/monthly-report/export",
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}
