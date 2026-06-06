import type { HouseholdMemberRole } from "@/shared/api";
import type { MoneyDto } from "@/shared/api";
import type { Locale } from "@/shared/i18n";
import { formatDateLocale } from "@/shared/lib/format-locale";

export function formatJoinedAt(iso: string, locale: Locale): string {
  return formatDateLocale(iso, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPeriodLabel(
  from: string,
  to: string,
  locale: Locale,
): string {
  const a = new Date(from + "T12:00:00");
  const b = new Date(to + "T12:00:00");
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return formatDateLocale(a, locale, { month: "long", year: "numeric" });
  }
  return `${formatDateLocale(a, locale, { day: "numeric", month: "short" })} — ${formatDateLocale(b, locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function roleLabel(
  role: HouseholdMemberRole,
  t: (path: string) => string,
): string {
  return t(`family.roles.${role}`);
}

export function formatMoneyValue(m: MoneyDto | string | undefined): string {
  if (!m) return "—";
  if (typeof m === "string") return m;
  return m.formatted ?? `${m.amount_minor} ${m.currency}`;
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function parseLimitMinorInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function getHouseholdMyRole(
  household: { myRole?: HouseholdMemberRole; my_role?: HouseholdMemberRole } | null,
): HouseholdMemberRole | undefined {
  return household?.myRole ?? household?.my_role;
}
