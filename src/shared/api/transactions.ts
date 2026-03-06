/**
 * API транзакций (v1/transactions):
 * - GET    /transactions           — список (query: accountId, categoryId, dateFrom, dateTo, search, page, limit)
 * - GET    /transactions/:id       — одна транзакция
 * - POST   /transactions           — создание
 * - PATCH  /transactions/:id       — обновление (частичное)
 * - DELETE /transactions/:id      — удаление (soft)
 * - POST   /transactions/:id/splits — разбивка по категориям (SetSplitsDto)
 * - GET    /transactions/templates — шаблоны
 * - POST   /transactions/templates — создание шаблона
 * - DELETE /transactions/templates/:id — удаление шаблона
 * - POST   /transactions/voice-parse, receipt-ocr, suggest-category — см. JSDoc у функций
 */
import { apiClient } from "./client";
import type {
  Transaction,
  GetTransactionsQuery,
  GetTransactionsResponse,
  CreateTransactionBody,
  UpdateTransactionBody,
  DeleteTransactionResponse,
  TransactionTemplate,
  CreateTransactionTemplateBody,
  CreateTransactionSplitsBody,
  VoiceParseBody,
  VoiceParseResponse,
  ReceiptOcrResponse,
  SuggestCategoryBody,
  SuggestCategoryResponse,
} from "./types";

/** GET /v1/transactions — список транзакций (query: accountId, categoryId, dateFrom, dateTo, search, page, limit). */
export async function getTransactions(
  query?: GetTransactionsQuery,
): Promise<GetTransactionsResponse> {
  const params = new URLSearchParams();
  if (query?.accountId) params.set("accountId", query.accountId);
  if (query?.categoryId) params.set("categoryId", query.categoryId);
  if (query?.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query?.dateTo) params.set("dateTo", query.dateTo);
  if (query?.search) params.set("search", query.search);
  if (query?.page != null) params.set("page", String(query.page));
  if (query?.limit != null) params.set("limit", String(Math.min(500, Math.max(1, query.limit))));
  const qs = params.toString();
  const path = qs ? `/transactions?${qs}` : "/transactions";
  return apiClient<GetTransactionsResponse>(path);
}

/** GET /v1/transactions/:id — одна транзакция. */
export async function getTransaction(id: string): Promise<Transaction> {
  return apiClient<Transaction>(`/transactions/${encodeURIComponent(id)}`);
}

export async function createTransaction(
  body: CreateTransactionBody,
): Promise<Transaction> {
  return apiClient<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /v1/transactions/:id — обновление (частичное). */
export async function updateTransaction(
  id: string,
  body: UpdateTransactionBody,
): Promise<Transaction> {
  return apiClient<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** DELETE /v1/transactions/:id — удаление (soft). */
export async function deleteTransaction(
  id: string,
): Promise<DeleteTransactionResponse> {
  return apiClient<DeleteTransactionResponse>(
    `/transactions/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}

/** GET /v1/transactions/templates — шаблоны транзакций. */
export async function getTransactionTemplates(): Promise<TransactionTemplate[]> {
  return apiClient<TransactionTemplate[]>("/transactions/templates");
}

/** POST /v1/transactions/templates — создание шаблона. */
export async function createTransactionTemplate(
  body: CreateTransactionTemplateBody,
): Promise<TransactionTemplate> {
  return apiClient<TransactionTemplate>("/transactions/templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** DELETE /v1/transactions/templates/:id — удаление шаблона. */
export async function deleteTransactionTemplate(id: string): Promise<void> {
  await apiClient<void>(
    `/transactions/templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** POST /v1/transactions/:id/splits — разбивка по категориям (SetSplitsDto). */
export async function createTransactionSplits(
  transactionId: string,
  body: CreateTransactionSplitsBody,
): Promise<Transaction> {
  return apiClient<Transaction>(
    `/transactions/${encodeURIComponent(transactionId)}/splits`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/** POST /v1/transactions/voice-parse — парсинг суммы из текста */
export async function voiceParseTransaction(
  body: VoiceParseBody,
): Promise<VoiceParseResponse> {
  return apiClient<VoiceParseResponse>("/transactions/voice-parse", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /v1/transactions/receipt-ocr — OCR чека (multipart/form-data) */
export async function receiptOcrTransaction(
  file: File,
): Promise<ReceiptOcrResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient<ReceiptOcrResponse>("/transactions/receipt-ocr", {
    method: "POST",
    body: formData,
  });
}

/** POST /v1/transactions/suggest-category — подсказка категории по memo (AI) */
export async function suggestCategoryTransaction(
  body: SuggestCategoryBody,
): Promise<SuggestCategoryResponse> {
  return apiClient<SuggestCategoryResponse>("/transactions/suggest-category", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
