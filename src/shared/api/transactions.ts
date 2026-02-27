/**
 * API транзакций: CRUD, шаблоны, сплиты, voice-parse, receipt-ocr
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
} from "./types";

export async function getTransactions(
  query?: GetTransactionsQuery,
): Promise<GetTransactionsResponse> {
  const search = new URLSearchParams();
  if (query?.accountId) search.set("accountId", query.accountId);
  if (query?.categoryId) search.set("categoryId", query.categoryId);
  if (query?.dateFrom) search.set("dateFrom", query.dateFrom);
  if (query?.dateTo) search.set("dateTo", query.dateTo);
  if (query?.search) search.set("search", query.search);
  if (query?.page != null) search.set("page", String(query.page));
  if (query?.limit != null) search.set("limit", String(query.limit));
  const qs = search.toString();
  const path = qs ? `/transactions?${qs}` : "/transactions";
  return apiClient<GetTransactionsResponse>(path);
}

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

export async function updateTransaction(
  id: string,
  body: UpdateTransactionBody,
): Promise<Transaction> {
  return apiClient<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

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

export async function getTransactionTemplates(): Promise<TransactionTemplate[]> {
  return apiClient<TransactionTemplate[]>("/transactions/templates");
}

export async function createTransactionTemplate(
  body: CreateTransactionTemplateBody,
): Promise<TransactionTemplate> {
  return apiClient<TransactionTemplate>("/transactions/templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteTransactionTemplate(id: string): Promise<void> {
  await apiClient<void>(
    `/transactions/templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** POST /v1/transactions/:id/splits — разбивка транзакции по категориям */
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
