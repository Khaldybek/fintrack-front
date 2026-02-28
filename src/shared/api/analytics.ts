/**
 * API аналитики: monthly, categories, trends, heatmap, anomalies,
 * top-categories, savings-rate, compare, export
 */
import { apiClient, apiClientRaw } from "./client";
import type {
  AnalyticsMonthlyResponse,
  AnalyticsCategoriesQuery,
  AnalyticsCategoriesResponse,
  AnalyticsTrendsResponse,
  AnalyticsHeatmapResponse,
  AnalyticsAnomaliesResponse,
  AnalyticsTopCategoriesQuery,
  AnalyticsTopCategoriesResponse,
  AnalyticsSavingsRateResponse,
  AnalyticsCompareQuery,
  AnalyticsCompareResponse,
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

/** GET /v1/analytics/heatmap?days=90 */
export async function getAnalyticsHeatmap(
  days?: number,
): Promise<AnalyticsHeatmapResponse> {
  const path = days != null ? `/analytics/heatmap?days=${days}` : "/analytics/heatmap";
  return apiClient<AnalyticsHeatmapResponse>(path);
}

export async function getAnalyticsAnomalies(): Promise<AnalyticsAnomaliesResponse> {
  return apiClient<AnalyticsAnomaliesResponse>("/analytics/anomalies");
}

/** GET /v1/analytics/top-categories */
export async function getAnalyticsTopCategories(
  query?: AnalyticsTopCategoriesQuery,
): Promise<AnalyticsTopCategoriesResponse> {
  const search = new URLSearchParams();
  if (query?.dateFrom) search.set("dateFrom", query.dateFrom);
  if (query?.dateTo) search.set("dateTo", query.dateTo);
  if (query?.limit != null) search.set("limit", String(query.limit));
  const qs = search.toString();
  return apiClient<AnalyticsTopCategoriesResponse>(
    qs ? `/analytics/top-categories?${qs}` : "/analytics/top-categories",
  );
}

/** GET /v1/analytics/savings-rate?months=6 */
export async function getAnalyticsSavingsRate(
  months?: number,
): Promise<AnalyticsSavingsRateResponse> {
  const path =
    months != null ? `/analytics/savings-rate?months=${months}` : "/analytics/savings-rate";
  return apiClient<AnalyticsSavingsRateResponse>(path);
}

/** GET /v1/analytics/compare?aFrom=...&aTo=...&bFrom=...&bTo=... */
export async function getAnalyticsCompare(
  query: AnalyticsCompareQuery,
): Promise<AnalyticsCompareResponse> {
  const search = new URLSearchParams({
    aFrom: query.aFrom,
    aTo: query.aTo,
    bFrom: query.bFrom,
    bTo: query.bTo,
  });
  return apiClient<AnalyticsCompareResponse>(`/analytics/compare?${search}`);
}

/** POST /v1/analytics/monthly-report/export → PDF-файл (blob) */
export async function exportMonthlyReport(
  body?: MonthlyReportExportBody,
): Promise<{ blob: Blob; filename: string }> {
  const res = await apiClientRaw("/analytics/monthly-report/export", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
  const year = body?.year ?? new Date().getFullYear();
  const month = String(body?.month ?? new Date().getMonth() + 1).padStart(2, "0");
  const filename = match?.[1]?.trim() ?? `monthly-report-${year}-${month}.pdf`;

  const blob = await res.blob();
  return { blob, filename };
}
