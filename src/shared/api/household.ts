/**
 * API домохозяйства (семейный режим): GET/POST /v1/household, invite, PATCH members/:id
 * Все мутации возвращают обновлённое домохозяйство (как GET).
 */
import { apiClient } from "./client";
import type {
  Household,
  CreateHouseholdBody,
  InviteHouseholdBody,
  PatchHouseholdMemberBody,
} from "./types";

/** GET /v1/household — домохозяйство текущего пользователя или null */
export async function getHousehold(): Promise<Household | null> {
  return apiClient<Household | null>("/household");
}

/** POST /v1/household — создание; текущий пользователь становится owner */
export async function createHousehold(body: CreateHouseholdBody): Promise<Household> {
  return apiClient<Household>("/household", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /v1/household/invite — приглашение по email; возвращает обновлённое домохозяйство */
export async function inviteHouseholdMember(body: InviteHouseholdBody): Promise<Household> {
  return apiClient<Household>("/household/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /v1/household/members/:id — смена роли; возвращает обновлённое домохозяйство */
export async function patchHouseholdMember(
  memberId: string,
  body: PatchHouseholdMemberBody,
): Promise<Household> {
  return apiClient<Household>(
    `/household/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}
