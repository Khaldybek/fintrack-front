/**
 * Auth API: register, login, refresh, logout.
 * Google — редирект на GET /v1/auth/google, callback обрабатывается на фронте.
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

export async function refresh(): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/auth/refresh", {
    method: "POST",
  });
}

export async function logout(): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}

/** URL для редиректа на Google OAuth (вызывать window.location.href = getGoogleAuthUrl()) */
export function getGoogleAuthUrl(): string {
  return `${API_V1}/auth/google`;
}
