/**
 * API домохозяйства (семейный режим): GET/POST /v1/household, invite, overview, leave, members
 */
import { API_V1 } from "@/shared/config";
import { apiClient } from "./client";
import type {
  AcceptHouseholdInviteBody,
  CreateHouseholdBody,
  CreateHouseholdBudgetBody,
  GetHouseholdOverviewQuery,
  GetHouseholdTransactionsQuery,
  GetHouseholdTransactionsResponse,
  Household,
  HouseholdBudget,
  HouseholdInvitePreview,
  HouseholdOverviewResponse,
  HouseholdPendingInvite,
  HouseholdSharedAccount,
  InviteHouseholdBody,
  PatchHouseholdMemberBody,
  UpdateHouseholdBudgetBody,
} from "./types";

function pickRole(raw: Record<string, unknown>): Household["myRole"] {
  const role = raw.myRole ?? raw.my_role;
  if (role === "owner" || role === "member" || role === "viewer") return role;
  return undefined;
}

function pickFeatures(raw: Record<string, unknown>): Household["features"] {
  const f = raw.features;
  if (!f || typeof f !== "object") return undefined;
  const obj = f as Record<string, unknown>;
  return {
    canInvite: Boolean(obj.canInvite ?? obj.can_invite),
    canManageBudgets: Boolean(obj.canManageBudgets ?? obj.can_manage_budgets),
  };
}

function normalizePendingInvite(raw: unknown): HouseholdPendingInvite | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "");
  const email = String(o.email ?? "");
  if (!id || !email) return null;
  const role = o.role;
  if (role !== "owner" && role !== "member" && role !== "viewer") return null;
  return {
    id,
    email,
    role,
    expiresAt: String(o.expiresAt ?? o.expires_at ?? ""),
  };
}

/** Бэкенд иногда отдаёт household без массива members / pendingInvites. */
export function normalizeHousehold(data: Household | null): Household | null {
  if (!data) return null;
  const raw = data as unknown as Record<string, unknown>;
  const pendingRaw = raw.pendingInvites ?? raw.pending_invites;
  const pendingInvites = Array.isArray(pendingRaw)
    ? pendingRaw
        .map(normalizePendingInvite)
        .filter((x): x is HouseholdPendingInvite => x !== null)
    : [];

  const myRole = pickRole(raw);

  return {
    ...data,
    members: Array.isArray(data.members) ? data.members : [],
    pendingInvites,
    membersLimit:
      typeof raw.membersLimit === "number"
        ? raw.membersLimit
        : typeof raw.members_limit === "number"
          ? raw.members_limit
          : data.membersLimit,
    membersCount:
      typeof raw.membersCount === "number"
        ? raw.membersCount
        : typeof raw.members_count === "number"
          ? raw.members_count
          : data.membersCount ?? data.members_count,
    pendingCount:
      typeof raw.pendingCount === "number"
        ? raw.pendingCount
        : typeof raw.pending_count === "number"
          ? raw.pending_count
          : data.pendingCount ?? pendingInvites.length,
    features: pickFeatures(raw) ?? data.features,
    myRole: myRole ?? data.myRole ?? data.my_role,
    my_role: myRole ?? data.my_role ?? data.myRole,
  };
}

function normalizeInvitePreview(raw: HouseholdInvitePreview): HouseholdInvitePreview {
  const r = raw as unknown as Record<string, unknown>;
  return {
    householdName: String(raw.householdName ?? r.household_name ?? ""),
    email: String(raw.email ?? ""),
    role: raw.role,
    expiresAt: String(raw.expiresAt ?? r.expires_at ?? ""),
  };
}

/** GET /v1/household — домохозяйство текущего пользователя или null */
export async function getHousehold(): Promise<Household | null> {
  const raw = await apiClient<Household | null>("/household");
  return normalizeHousehold(raw);
}

/** POST /v1/household — создание; текущий пользователь становится owner */
export async function createHousehold(body: CreateHouseholdBody): Promise<Household> {
  const raw = await apiClient<Household>("/household", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeHousehold(raw) as Household;
}

/** POST /v1/household/invite — pending-приглашение + email */
export async function inviteHouseholdMember(body: InviteHouseholdBody): Promise<Household> {
  const raw = await apiClient<Household>("/household/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeHousehold(raw) as Household;
}

/** GET /v1/household/invites — список pending (owner/member) */
export async function getHouseholdInvites(): Promise<HouseholdPendingInvite[]> {
  const raw = await apiClient<HouseholdPendingInvite[] | { items?: HouseholdPendingInvite[] }>(
    "/household/invites",
  );
  const list = Array.isArray(raw) ? raw : (raw.items ?? []);
  return list
    .map(normalizePendingInvite)
    .filter((x): x is HouseholdPendingInvite => x !== null);
}

/** DELETE /v1/household/invites/:id — отменить приглашение */
export async function deleteHouseholdInvite(inviteId: string): Promise<void> {
  await apiClient<unknown>(
    `/household/invites/${encodeURIComponent(inviteId)}`,
    { method: "DELETE" },
  );
}

/** GET /v1/household/invites/preview?token= — без JWT */
export async function getHouseholdInvitePreview(
  token: string,
): Promise<HouseholdInvitePreview> {
  const url = `${API_V1}/household/invites/preview?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let message = "Invalid or expired invite";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = (await res.json()) as HouseholdInvitePreview;
  return normalizeInvitePreview(data);
}

/** POST /v1/household/invites/accept — принять приглашение (JWT, email = invite.email) */
export async function acceptHouseholdInvite(
  body: AcceptHouseholdInviteBody,
): Promise<Household> {
  const raw = await apiClient<Household>("/household/invites/accept", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeHousehold(raw) as Household;
}

/** PATCH /v1/household/members/:id — смена роли (только owner) */
export async function patchHouseholdMember(
  memberId: string,
  body: PatchHouseholdMemberBody,
): Promise<Household> {
  const raw = await apiClient<Household>(
    `/household/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return normalizeHousehold(raw) as Household;
}

/** DELETE /v1/household/members/:id — удалить участника (только owner) */
export async function deleteHouseholdMember(memberId: string): Promise<Household> {
  const raw = await apiClient<Household>(
    `/household/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
  return normalizeHousehold(raw) as Household;
}

/** POST /v1/household/leave — выйти из семьи */
export async function leaveHousehold(): Promise<void> {
  await apiClient<unknown>("/household/leave", { method: "POST" });
}

/** GET /v1/household/overview */
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

/** GET /v1/household/accounts — shared-счета */
export async function getHouseholdAccounts(): Promise<HouseholdSharedAccount[]> {
  const raw = await apiClient<
    HouseholdSharedAccount[] | { items?: HouseholdSharedAccount[]; accounts?: HouseholdSharedAccount[] }
  >("/household/accounts");
  if (Array.isArray(raw)) return raw;
  return raw.items ?? raw.accounts ?? [];
}

/** GET /v1/household/transactions — read-only */
export async function getHouseholdTransactions(
  query?: GetHouseholdTransactionsQuery,
): Promise<GetHouseholdTransactionsResponse> {
  const params = new URLSearchParams();
  if (query?.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query?.dateTo) params.set("dateTo", query.dateTo);
  if (query?.accountId) params.set("accountId", query.accountId);
  if (query?.memberUserId) params.set("memberUserId", query.memberUserId);
  if (query?.page != null) params.set("page", String(query.page));
  if (query?.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiClient<GetHouseholdTransactionsResponse>(
    qs ? `/household/transactions?${qs}` : "/household/transactions",
  );
}

function normalizeHouseholdBudget(raw: HouseholdBudget): HouseholdBudget {
  const r = raw as unknown as Record<string, unknown>;
  return {
    ...raw,
    categoryName: String(raw.categoryName ?? r.category_name ?? ""),
    limitMinor:
      typeof raw.limitMinor === "number"
        ? raw.limitMinor
        : typeof raw.limit_minor === "number"
          ? raw.limit_minor
          : 0,
    progress_percent:
      typeof raw.progress_percent === "number"
        ? raw.progress_percent
        : typeof raw.progressPercent === "number"
          ? raw.progressPercent
          : undefined,
  };
}

/** GET /v1/household/budgets */
export async function getHouseholdBudgets(): Promise<HouseholdBudget[]> {
  const raw = await apiClient<HouseholdBudget[] | { items?: HouseholdBudget[] }>(
    "/household/budgets",
  );
  const list = Array.isArray(raw) ? raw : (raw.items ?? []);
  return list.map(normalizeHouseholdBudget);
}

/** POST /v1/household/budgets */
export async function createHouseholdBudget(
  body: CreateHouseholdBudgetBody,
): Promise<HouseholdBudget> {
  const raw = await apiClient<HouseholdBudget>("/household/budgets", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeHouseholdBudget(raw);
}

/** PATCH /v1/household/budgets/:id */
export async function updateHouseholdBudget(
  id: string,
  body: UpdateHouseholdBudgetBody,
): Promise<HouseholdBudget> {
  const raw = await apiClient<HouseholdBudget>(
    `/household/budgets/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return normalizeHouseholdBudget(raw);
}

/** DELETE /v1/household/budgets/:id */
export async function deleteHouseholdBudget(id: string): Promise<void> {
  await apiClient<unknown>(`/household/budgets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
