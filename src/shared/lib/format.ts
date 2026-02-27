/**
 * Форматирование значений (FSD shared/lib)
 */

export function formatAmount(value: number, currency = "₸"): string {
  return `${value.toLocaleString("ru-RU")} ${currency}`;
}
