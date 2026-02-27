/**
 * Конфигурация API (бэкенд на 3000, фронт на 3001)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const API_V1 = `${API_BASE_URL}/v1`;
