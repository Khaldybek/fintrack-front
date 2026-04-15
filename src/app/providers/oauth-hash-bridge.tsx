"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/shared/config";
import { parseOAuthRedirectLocation } from "@/shared/lib";

const BRIDGE_PATHNAMES: readonly string[] = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.register,
];

/**
 * Если бэкенд ошибочно редиректит на `/` или страницу входа с токенами в hash/query,
 * переносим на `/auth/callback`, где уже выполняется setSession.
 *
 * Важно: `router.replace` в Next App Router не гарантирует перенос hash — используем полный переход.
 */
export function OAuthHashBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!BRIDGE_PATHNAMES.includes(pathname)) return;

    const parsed = parseOAuthRedirectLocation(window.location);
    const shouldBridge =
      parsed.ok ||
      (parsed.ok === false && parsed.reason === "oauth_error");

    if (!shouldBridge) return;

    const target = `${ROUTES.authCallback}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, [pathname]);

  return null;
}
