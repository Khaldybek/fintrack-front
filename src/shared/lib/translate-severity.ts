type TranslateFn = (path: string) => string;

const STATUS_I18N: Record<string, string> = {
  stable: "common.severity.stable",
  good: "common.severity.good",
  attention: "common.severity.attention",
  risk: "common.severity.risk",
  // Fallback if API returns localized Russian labels
  Стабильно: "common.severity.stable",
  "В норме": "common.severity.good",
  Внимание: "common.severity.attention",
  Осторожно: "common.severity.attention",
  Риск: "common.severity.risk",
  Перерасход: "common.severity.risk",
};

/** Переводит status/severity с API (stable, good, risk или русские подписи). */
export function translateSeverityLabel(
  status: string | undefined,
  severity: string | undefined,
  t: TranslateFn,
): string {
  for (const raw of [status, severity]) {
    if (!raw) continue;
    const path = STATUS_I18N[raw] ?? STATUS_I18N[raw.toLowerCase()];
    if (path) return t(path);
  }
  return status ?? severity ?? "";
}

const FEATURE_GATED_KEYS: Record<string, string> = {
  accounts_limit: "billing.featureGated.accounts_limit",
  budgets_limit: "billing.featureGated.budgets_limit",
  goals_limit: "billing.featureGated.goals_limit",
  dashboard_index: "billing.featureGated.dashboard_index",
  family_mode: "billing.featureGated.family_mode",
  bank_statement_import: "billing.featureGated.bank_statement_import",
};

/** Локализованный текст апгрейда вместо upgrade_hint с бэка (часто на русском). */
export function translateFeatureGatedHint(
  featureCode: string | undefined,
  upgradeHint: string | undefined,
  t: TranslateFn,
): string {
  if (featureCode) {
    const path = FEATURE_GATED_KEYS[featureCode];
    if (path) {
      const msg = t(path);
      if (msg !== path) return msg;
    }
  }
  return upgradeHint ?? t("upgrade.title");
}
