import type { Locale } from "./I18nProvider";

export const LOCALE_STORAGE_KEY = "fintrack_locale";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  try {
    const s = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (s === "kk" || s === "ru") return s;
  } catch {
    /* ignore */
  }
  return "ru";
}

export function toAcceptLanguage(locale: Locale): string {
  return locale === "kk" ? "kk-KZ,kk;q=0.9" : "ru-RU,ru;q=0.9";
}
