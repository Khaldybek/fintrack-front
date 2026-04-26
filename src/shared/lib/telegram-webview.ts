/** Встроенный браузер Telegram (и похожие) часто ломают OAuth / cookie / sessionStorage. */

export function isTelegramInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /\bTelegram\b/i.test(ua);
}
