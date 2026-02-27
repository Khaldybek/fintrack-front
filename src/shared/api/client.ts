/**
 * API-клиент: Bearer access token в памяти, refresh token — в httpOnly cookie (бэкенд).
 * credentials: 'include' — куки с refresh автоматически уходят на сервер.
 * При 401: POST /auth/refresh (с cookie) → новый access, повтор исходного запроса.
 * Если refresh не прошёл — редирект на /login.
 */
import { API_V1, ROUTES } from "@/shared/config";
import { ApiError, getAccessTokenFromResponse, type FeatureGatedBody } from "./types";
import type { AuthResponse } from "./types";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export type RequestConfig = RequestInit & {
  basePath?: string;
};

/** Обновление сессии: refresh token берётся из cookie (credentials: "include"). */
async function doRefresh(): Promise<string> {
  const res = await fetch(`${API_V1}/auth/refresh`, {
    method: "POST",
    credentials: "include", // отправляем httpOnly cookie с refresh token
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new ApiError("Session expired", res.status);
  const data = (await res.json()) as AuthResponse;
  accessToken = getAccessTokenFromResponse(data);
  return accessToken;
}

export async function apiClient<T>(
  path: string,
  options?: RequestConfig,
  isRetry = false,
): Promise<T> {
  const basePath = options?.basePath ?? API_V1;
  const { basePath: _, ...init } = options ?? {};
  const url = path.startsWith("http") ? path : `${basePath}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401 && !isRetry && !path.includes("/auth/refresh")) {
    try {
      await doRefresh();
      return apiClient<T>(path, options, true);
    } catch (err) {
      if (
        typeof window !== "undefined" &&
        err instanceof ApiError &&
        err.status === 401 &&
        window.location.pathname !== ROUTES.home
      ) {
        window.location.href = ROUTES.login;
      }
      throw err;
    }
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }

    if (res.status === 403 && body && typeof body === "object" && "code" in body) {
      const gated = body as FeatureGatedBody;
      if (gated.code === "FEATURE_GATED") {
        throw new ApiError(
          gated.upgrade_hint ?? "Feature gated",
          res.status,
          body,
        );
      }
    }

    throw new ApiError(
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: string }).message)
        : `API error: ${res.status}`,
      res.status,
      body,
    );
  }

  if (res.status === 204) {
    return undefined as unknown as Promise<T>;
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}
