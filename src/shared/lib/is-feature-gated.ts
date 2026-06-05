import { ApiError, type FeatureGatedBody } from "@/shared/api/types";

export function isFeatureGatedError(err: unknown): err is ApiError {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  const body = err.body as FeatureGatedBody | undefined;
  return body?.code === "FEATURE_GATED";
}
