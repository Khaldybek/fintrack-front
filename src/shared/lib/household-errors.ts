import { ApiError } from "@/shared/api/types";

export function isHouseholdMembersLimitError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const body = err.body;
  if (body && typeof body === "object") {
    const code = (body as { code?: string }).code;
    if (code === "household_members_limit") return true;
  }
  return err.message.toLowerCase().includes("household_members_limit");
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  const body = err.body;
  if (body && typeof body === "object" && "code" in body) {
    return String((body as { code?: string }).code ?? "");
  }
  return undefined;
}
