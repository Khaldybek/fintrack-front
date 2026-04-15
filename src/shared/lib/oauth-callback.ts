/**
 * Параметры OAuth после редиректа на фронт.
 * На iOS/Safari бэкенд часто отдаёт токены в query (?access_token=), а не в hash (#access_token=).
 */

export type ParsedOAuthRedirect =
  | { ok: true; accessToken: string; userRaw: string }
  | { ok: false; reason: "missing" | "oauth_error"; oauthError?: string; oauthErrorDescription?: string };

function paramsFromLocation(loc: Location): URLSearchParams {
  const tryHash = loc.hash ? loc.hash.replace(/^#/, "") : "";
  const search = loc.search ? loc.search.replace(/^\?/, "") : "";

  const fromHash = tryHash ? new URLSearchParams(tryHash) : new URLSearchParams();
  const fromSearch = search ? new URLSearchParams(search) : new URLSearchParams();

  const hasToken = (p: URLSearchParams) =>
    Boolean(p.get("access_token") || p.get("token") || p.get("id_token"));
  const hasOAuthErr = (p: URLSearchParams) => Boolean(p.get("error"));

  if (hasOAuthErr(fromHash) || hasToken(fromHash)) return fromHash;
  if (hasOAuthErr(fromSearch) || hasToken(fromSearch)) return fromSearch;
  if (tryHash) return fromHash;
  return fromSearch;
}

/** Разбор user из OAuth (JSON в параметре, может быть закодирован). */
export function parseOAuthUser(userStr: string): { id: string; email: string; name?: string | null } {
  const decoded = (() => {
    try {
      return decodeURIComponent(userStr);
    } catch {
      return userStr;
    }
  })();
  try {
    return JSON.parse(decoded) as { id: string; email: string; name?: string | null };
  } catch {
    return JSON.parse(userStr) as { id: string; email: string; name?: string | null };
  }
}

export function parseOAuthRedirectLocation(loc: Location): ParsedOAuthRedirect {
  const params = paramsFromLocation(loc);

  const oauthErr = params.get("error");
  if (oauthErr) {
    return {
      ok: false,
      reason: "oauth_error",
      oauthError: oauthErr,
      oauthErrorDescription: params.get("error_description") ?? undefined,
    };
  }

  const accessToken =
    params.get("access_token") ?? params.get("token") ?? params.get("id_token");
  const userRaw = params.get("user");
  if (!accessToken || !userRaw) {
    return { ok: false, reason: "missing" };
  }

  return { ok: true, accessToken, userRaw };
}
