"use client";

import { useEffect } from "react";
import { useI18n } from "@/shared/i18n";

/** Синхронизирует <html lang> с выбранной локалью (ru | kk). */
export function DocumentLang() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale === "kk" ? "kk" : "ru";
  }, [locale]);

  return null;
}
