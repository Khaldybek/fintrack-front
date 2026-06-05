"use client";

import { useI18n } from "@/shared/i18n";

type LocaleSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export function LocaleSwitcher({
  compact = false,
  className = "",
}: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const btnClass = (active: boolean) =>
    [
      "locale-switcher-btn",
      compact ? "compact" : "",
      active ? "active" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div
      className={`locale-switcher ${className}`.trim()}
      role="group"
      aria-label={t("shell.locale")}
    >
      <button
        className={btnClass(locale === "ru")}
        onClick={() => setLocale("ru")}
        type="button"
      >
        {t("profile.interface.ru")}
      </button>
      <button
        className={btnClass(locale === "kk")}
        onClick={() => setLocale("kk")}
        type="button"
      >
        {t("profile.interface.kk")}
      </button>
    </div>
  );
}
