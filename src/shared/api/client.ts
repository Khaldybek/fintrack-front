/**
 * API-клиент: Bearer access token в памяти + sessionStorage (переживает перезагрузку вкладки).
 * Refresh token — в httpOnly cookie (бэкенд). При 401: один общий refresh, повтор запросов.
 */
import { API_V1, ROUTES } from "@/shared/config";
import { ApiError, getAccessTokenFromResponse, type FeatureGatedBody } from "./types";
import type { AuthResponse } from "./types";

const STORAGE_KEY = "fintrack_access_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

let accessToken: string | null = getStoredToken();

export function setAccessToken(token: string | null) {
  accessToken = token;
  setStoredToken(token);
}

export type RequestConfig = RequestInit & {
  basePath?: string;
};

let refreshPromise: Promise<string> | null = null;

/** Один refresh на все параллельные 401 — остальные ждут тот же промис. */
async function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await fetch(`${API_V1}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new ApiError("Session expired", res.status);
    const data = (await res.json()) as AuthResponse;
    const token = getAccessTokenFromResponse(data);
    accessToken = token;
    setStoredToken(token);
    return token;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
    ...(init.headers as Record<string, string>),
  };
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
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
      if (typeof window !== "undefined" && err instanceof ApiError && err.status === 401) {
        const pathname = window.location.pathname;
        const isAuthPage = pathname === ROUTES.login || pathname === ROUTES.register ||
          pathname === ROUTES.forgotPassword || pathname === ROUTES.resetPassword || pathname.startsWith("/auth/");
        if (!isAuthPage) window.location.href = ROUTES.login;
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

/**
 * Как apiClient, но возвращает сырой Response (нужен для скачивания файлов).
 * Auth, 401-retry и redirect на логин — те же правила.
 */
export async function apiClientRaw(
  path: string,
  options?: RequestConfig,
  isRetry = false,
): Promise<Response> {
  const basePath = options?.basePath ?? API_V1;
  const { basePath: _, ...init } = options ?? {};
  const url = path.startsWith("http") ? path : `${basePath}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, { ...init, credentials: "include", headers });

  if (res.status === 401 && !isRetry && !path.includes("/auth/refresh")) {
    try {
      await doRefresh();
      return apiClientRaw(path, options, true);
    } catch (err) {
      if (typeof window !== "undefined" && err instanceof ApiError && err.status === 401) {
        const pathname = window.location.pathname;
        const isAuthPage = pathname === ROUTES.login || pathname === ROUTES.register ||
          pathname === ROUTES.forgotPassword || pathname === ROUTES.resetPassword || pathname.startsWith("/auth/");
        if (!isAuthPage) window.location.href = ROUTES.login;
      }
      throw err;
    }
  }

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: string }).message)
        : `API error: ${res.status}`,
      res.status,
      body,
    );
  }

  return res;
}
