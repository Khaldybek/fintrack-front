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
export function formatMoney(
  value: unknown,
  options?: { divideBy100?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? "—";

  if (value == null) return fallback;

  if (typeof value === "string") return value || fallback;

  if (typeof value === "number") {
    const amount = options?.divideBy100 === true ? value / 100 : value;
    return amount.toLocaleString("ru-KZ") || fallback;
  }

  if (typeof value === "object" && value !== null) {
    const v = value as { formatted?: unknown; amount_minor?: unknown; currency?: unknown };

    if (typeof v.formatted === "string") return v.formatted;

    if (typeof v.amount_minor === "number") {
      const amount = options?.divideBy100 === true ? v.amount_minor / 100 : v.amount_minor;
      const currency = typeof v.currency === "string" ? ` ${v.currency}` : " ₸";
      return `${amount.toLocaleString("ru-KZ")}${currency}`;
    }
  }

  return String(value) || fallback;
}
