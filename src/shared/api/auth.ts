/**
 * Auth API: register, login, refresh, logout, forgot-password, reset-password.
 * Cookie: refresh-токен отправляется с credentials: 'include' (в apiClient).
 */
import { apiClient } from "./client";
import type { AuthResponse } from "./types";
import { API_V1 } from "@/shared/config";

export type RegisterBody = {
  email: string;
  password: string;
  name?: string;
};

export type LoginBody = {
  email: string;
  password: string;
};

export async function register(body: RegisterBody): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /auth/refresh — тело явно {}, чтобы бэкенд (ValidationPipe) не получал лишних полей (на Vercel иначе мог прийти path). */
export async function refresh(): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** POST /v1/auth/logout — тело не нужно (пустой объект). Cookie с refresh-токеном отправляются (credentials: 'include'). Ответ 200: { success: true }. */
export async function logout(): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** POST /v1/auth/forgot-password — тело { email }. Ответ 200: { success: true } (даже если email не найден). На email уходит письмо со ссылкой. */
export async function forgotPassword(email: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** POST /v1/auth/reset-password — тело { token, newPassword }. newPassword ≥ 8 символов. Ответ 200: { success: true }. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

/** URL для редиректа на Google OAuth (вызывать window.location.href = getGoogleAuthUrl()) */
export function getGoogleAuthUrl(): string {
  return `${API_V1}/auth/google`;
}
