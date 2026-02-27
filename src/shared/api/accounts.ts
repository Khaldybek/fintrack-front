/**
 * API счетов: GET/POST /v1/accounts, GET/PATCH/DELETE /v1/accounts/:id
 */
import { apiClient } from "./client";
import type {
  Account,
  CreateAccountBody,
  UpdateAccountBody,
  DeleteAccountResponse,
} from "./types";

export async function getAccounts(): Promise<Account[]> {
  return apiClient<Account[]>("/accounts");
}

export async function getAccount(id: string): Promise<Account> {
  return apiClient<Account>(`/accounts/${encodeURIComponent(id)}`);
}

export async function createAccount(body: CreateAccountBody): Promise<Account> {
  return apiClient<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAccount(
  id: string,
  body: UpdateAccountBody,
): Promise<Account> {
  return apiClient<Account>(`/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteAccount(id: string): Promise<DeleteAccountResponse> {
  return apiClient<DeleteAccountResponse>(`/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
