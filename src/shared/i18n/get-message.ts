/** Доступ по пути вида "nav.dashboard" или "extraNav.items.cashflow.label" */
export function getMessage(
  messages: Record<string, unknown>,
  path: string,
): string {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}
