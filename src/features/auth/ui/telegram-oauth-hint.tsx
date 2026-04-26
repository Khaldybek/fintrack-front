"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/shared/i18n";
import { isTelegramInAppBrowser } from "@/shared/lib";

/** Предупреждение для встроенного браузера Telegram перед OAuth через Google. */
export function TelegramOauthHint() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isTelegramInAppBrowser());
  }, []);

  if (!visible) return null;

  return (
    <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
      {t("auth.oauth.telegramInlineBrowserHint")}
    </p>
  );
}
