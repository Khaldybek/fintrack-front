/**
 * Универсальный форматтер денег.
 * Бэкенд может отдавать поле как:
 *   - строку ("1 200 ₸")
 *   - объект { amount_minor, currency, formatted } — число в **целых единицах валюты** (₸)
 *   - число — те же целые единицы
 *   - undefined / null
 *
 * `divideBy100: true` — только если API реально отдаёт сумму в тиынах (100 = 1 ₸).
 */
import type { Locale } from "@/shared/i18n";
import { getStoredLocale } from "@/shared/i18n/locale-storage";
import { formatNumberLocale } from "./format-locale";

export function formatMoney(
  value: unknown,
  options?: { divideBy100?: boolean; fallback?: string; locale?: Locale },
): string {
  const fallback = options?.fallback ?? "—";
  const locale = options?.locale ?? getStoredLocale();

  if (value == null) return fallback;

  if (typeof value === "string") return value || fallback;

  if (typeof value === "number") {
    const amount = options?.divideBy100 === true ? value / 100 : value;
    return formatNumberLocale(amount, locale) || fallback;
  }

  if (typeof value === "object" && value !== null) {
    const v = value as { formatted?: unknown; amount_minor?: unknown; currency?: unknown };

    if (typeof v.formatted === "string") return v.formatted;

    if (typeof v.amount_minor === "number") {
      const amount = options?.divideBy100 === true ? v.amount_minor / 100 : v.amount_minor;
      const currency = typeof v.currency === "string" ? ` ${v.currency}` : " ₸";
      return `${formatNumberLocale(amount, locale)}${currency}`;
    }
  }

  return String(value) || fallback;
}

const CENTS_CURRENCIES = new Set(["USD", "EUR"]);

/**
 * Парсит ввод начального баланса счёта в balanceMinor для POST /v1/accounts.
 * Пустая строка → null (поле не отправлять).
 * KZT/RUB — целые единицы; USD/EUR — пользователь вводит в долларах/евро, в API — центы.
 */
export function parseBalanceMinorInput(
  raw: string,
  currency: string,
): number | null {
  const trimmed = raw.replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  if (CENTS_CURRENCIES.has(currency)) {
    return Math.round(n * 100);
  }
  return Math.round(n);
}
