import type { Locale } from "@/shared/i18n";

export function toIntlLocale(locale: Locale): string {
  return locale === "kk" ? "kk-KZ" : "ru-KZ";
}

export function formatDateLocale(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(toIntlLocale(locale), options);
}

export function formatNumberLocale(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(toIntlLocale(locale), options);
}
