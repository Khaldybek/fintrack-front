/**
 * API домохозяйства (семейный режим): GET/POST /v1/household, invite, overview, leave, members
 */
import { apiClient } from "./client";
import type {
  Household,
  CreateHouseholdBody,
  InviteHouseholdBody,
  PatchHouseholdMemberBody,
  HouseholdOverviewResponse,
  GetHouseholdOverviewQuery,
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

/** PATCH /v1/household/members/:id — смена роли (только owner); возвращает обновлённое домохозяйство */
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

/** DELETE /v1/household/members/:id — удалить участника (только owner) */
export async function deleteHouseholdMember(memberId: string): Promise<Household> {
  return apiClient<Household>(
    `/household/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
}

/** POST /v1/household/leave — выйти из семьи */
export async function leaveHousehold(): Promise<void> {
  await apiClient<unknown>("/household/leave", { method: "POST" });
}

/** GET /v1/household/overview — агрегированные данные за период (без query — текущий месяц в TZ пользователя) */
export async function getHouseholdOverview(
  query?: GetHouseholdOverviewQuery,
): Promise<HouseholdOverviewResponse> {
  const params = new URLSearchParams();
  if (query?.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query?.dateTo) params.set("dateTo", query.dateTo);
  const qs = params.toString();
  return apiClient<HouseholdOverviewResponse>(
    qs ? `/household/overview?${qs}` : "/household/overview",
  );
}
