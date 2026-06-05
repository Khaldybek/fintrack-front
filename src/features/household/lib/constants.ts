import type { HouseholdMemberRole } from "@/shared/api";

export const INVITE_ROLE_OPTIONS: HouseholdMemberRole[] = ["member", "viewer"];

export const ROLE_OPTIONS: HouseholdMemberRole[] = ["owner", "member", "viewer"];

export type FamilyTabId =
  | "overview"
  | "members"
  | "accounts"
  | "transactions"
  | "budgets";

export const FAMILY_TABS: FamilyTabId[] = [
  "overview",
  "members",
  "accounts",
  "transactions",
  "budgets",
];
