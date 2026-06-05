/**
 * API импорта банковских выписок: /v1/statement-imports
 */
import { apiClient } from "./client";
import type {
  ConfirmStatementImportBody,
  ConfirmStatementImportResponse,
  DeleteStatementImportResponse,
  PatchStatementImportRowsBody,
  StatementImportPreview,
} from "./types";

/** POST /v1/statement-imports — загрузка CSV/XLSX/PDF */
export async function uploadStatementImport(
  file: File,
  accountId: string,
): Promise<StatementImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("accountId", accountId);
  return apiClient<StatementImportPreview>("/statement-imports", {
    method: "POST",
    body: formData,
  });
}

/** GET /v1/statement-imports/:id */
export async function getStatementImport(
  id: string,
): Promise<StatementImportPreview> {
  return apiClient<StatementImportPreview>(
    `/statement-imports/${encodeURIComponent(id)}`,
  );
}

/** PATCH /v1/statement-imports/:id/rows */
export async function patchStatementImportRows(
  id: string,
  body: PatchStatementImportRowsBody,
): Promise<StatementImportPreview> {
  return apiClient<StatementImportPreview>(
    `/statement-imports/${encodeURIComponent(id)}/rows`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

/** POST /v1/statement-imports/:id/confirm */
export async function confirmStatementImport(
  id: string,
  body?: ConfirmStatementImportBody,
): Promise<ConfirmStatementImportResponse> {
  return apiClient<ConfirmStatementImportResponse>(
    `/statement-imports/${encodeURIComponent(id)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}

/** DELETE /v1/statement-imports/:id */
export async function deleteStatementImport(
  id: string,
): Promise<DeleteStatementImportResponse> {
  return apiClient<DeleteStatementImportResponse>(
    `/statement-imports/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
