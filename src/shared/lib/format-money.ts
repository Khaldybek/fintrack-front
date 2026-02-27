/**
 * Универсальный форматтер денег.
 * Бэкенд может отдавать любое денежное поле как:
 *   - строку ("1 200 ₸")
 *   - объект { amount_minor, currency, formatted }
 *   - число (минорные единицы)
 *   - undefined / null
 *
 * Всегда возвращает строку — безопасно передавать в JSX.
 */
export function formatMoney(
  value: unknown,
  options?: { divideBy100?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? "—";

  if (value == null) return fallback;

  if (typeof value === "string") return value || fallback;

  if (typeof value === "number") {
    const amount = options?.divideBy100 === false ? value : value / 100;
    return amount.toLocaleString("ru-KZ") || fallback;
  }

  if (typeof value === "object" && value !== null) {
    const v = value as { formatted?: unknown; amount_minor?: unknown; currency?: unknown };

    if (typeof v.formatted === "string") return v.formatted;

    if (typeof v.amount_minor === "number") {
      const amount = v.amount_minor / 100;
      const currency = typeof v.currency === "string" ? ` ${v.currency}` : " ₸";
      return `${amount.toLocaleString("ru-KZ")}${currency}`;
    }
  }

  return String(value) || fallback;
}
