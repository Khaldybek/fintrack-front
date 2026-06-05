import type { HouseholdMemberRole } from "@/shared/api";
import type { MoneyDto } from "@/shared/api";

export function formatJoinedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPeriodLabel(from: string, to: string): string {
  const a = new Date(from + "T12:00:00");
  const b = new Date(to + "T12:00:00");
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return a.toLocaleDateString("ru-KZ", { month: "long", year: "numeric" });
  }
  return `${a.toLocaleDateString("ru-KZ", { day: "numeric", month: "short" })} — ${b.toLocaleDateString("ru-KZ", { day: "numeric", month: "short", year: "numeric" })}`;
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
