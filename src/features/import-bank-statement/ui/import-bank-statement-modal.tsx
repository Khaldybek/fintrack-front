"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { UpgradeModal } from "@/features/upgrade/ui/upgrade-modal";
import type {
  Account,
  Category,
  StatementImportPreview,
  StatementImportRow,
} from "@/shared/api";
import {
  FeatureGatedError,
  confirmStatementImport,
  deleteStatementImport,
  getAccounts,
  getCategories,
  patchStatementImportRows,
  uploadStatementImport,
} from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatMoney, useBodyScrollLock } from "@/shared/lib";
import { isFeatureGatedError } from "@/shared/lib/is-feature-gated";

const STATEMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const STATEMENT_ACCEPT =
  ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
const ALLOWED_EXT = /\.(csv|xlsx|xls|pdf)$/i;

export type ImportBankStatementModalProps = {
  onSuccess?: (created: number) => void;
};

export type ImportBankStatementModalHandle = {
  open: () => void;
};

function isAllowedStatementFile(file: File): boolean {
  if (ALLOWED_EXT.test(file.name)) return true;
  const t = file.type.toLowerCase();
  return (
    t.includes("csv") ||
    t.includes("pdf") ||
    t.includes("spreadsheet") ||
    t.includes("excel")
  );
}

function gatedMessage(
  err: unknown,
  fallback: string,
): { gated: boolean; message: string } {
  if (err instanceof FeatureGatedError || isFeatureGatedError(err)) {
    const hint =
      err instanceof FeatureGatedError
        ? err.upgradeHint
        : (err as { upgradeHint?: string }).upgradeHint;
    return { gated: true, message: hint ?? fallback };
  }
  return { gated: false, message: (err as Error)?.message ?? fallback };
}

export const ImportBankStatementModal = forwardRef<
  ImportBankStatementModalHandle,
  ImportBankStatementModalProps
>(function ImportBankStatementModal({ onSuccess }, ref) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memoPatchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<StatementImportPreview | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [patching, setPatching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  useBodyScrollLock(isOpen);

  const reset = useCallback(() => {
    setStep("upload");
    setAccountId("");
    setFile(null);
    setPreview(null);
    setError(null);
    setPatchError(null);
    setDragOver(false);
    Object.values(memoPatchTimers.current).forEach(clearTimeout);
    memoPatchTimers.current = {};
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  const open = useCallback(() => {
    reset();
    setIsOpen(true);
    setLoadingMeta(true);
    Promise.all([getAccounts(), getCategories()])
      .then(([accs, cats]) => {
        const list = accs ?? [];
        setAccounts(list);
        setCategories(cats ?? []);
        if (list.length > 0) setAccountId(list[0].id);
      })
      .catch(() => {
        setError(t("statementImport.uploadError"));
      })
      .finally(() => setLoadingMeta(false));
  }, [reset, t]);

  useImperativeHandle(ref, () => ({ open }), [open]);

  useEffect(() => {
    return () => {
      Object.values(memoPatchTimers.current).forEach(clearTimeout);
    };
  }, []);

  const applyFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > STATEMENT_MAX_SIZE_BYTES) {
      setError(t("statementImport.fileTooLarge"));
      return;
    }
    if (!isAllowedStatementFile(f)) {
      setError(t("statementImport.fileUnsupported"));
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!accountId) {
      setError(t("statementImport.noAccount"));
      return;
    }
    if (!file) {
      setError(t("statementImport.noFile"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadStatementImport(file, accountId);
      setPreview(res);
      setStep("preview");
    } catch (err) {
      const { gated, message } = gatedMessage(
        err,
        t("statementImport.gated"),
      );
      if (gated) {
        setUpgradeMessage(message);
        setUpgradeOpen(true);
      } else {
        setError(message || t("statementImport.uploadError"));
      }
    } finally {
      setUploading(false);
    }
  };

  const patchRows = async (
    items: { rowId: string; selected?: boolean; categoryId?: string | null; memo?: string | null }[],
    rollback?: StatementImportPreview,
  ) => {
    if (!preview) return;
    setPatching(true);
    setPatchError(null);
    try {
      const updated = await patchStatementImportRows(preview.id, { rows: items });
      setPreview(updated);
    } catch (err) {
      if (rollback) setPreview(rollback);
      setPatchError(t("statementImport.patchError"));
      const { gated, message } = gatedMessage(err, t("statementImport.gated"));
      if (gated) {
        setUpgradeMessage(message);
        setUpgradeOpen(true);
      }
    } finally {
      setPatching(false);
    }
  };

  const updateRowLocal = (
    rowId: string,
    patch: Partial<
      Pick<StatementImportRow, "selected" | "categoryId" | "memo" | "categoryName">
    >,
  ): StatementImportPreview | null => {
    if (!preview) return null;
    const next = {
      ...preview,
      rows: preview.rows.map((r) =>
        r.id === rowId ? { ...r, ...patch } : r,
      ),
    };
    setPreview(next);
    return next;
  };

  const handleToggleSelected = (row: StatementImportRow) => {
    const rollback = preview;
    const nextSelected = !row.selected;
    updateRowLocal(row.id, { selected: nextSelected });
    void patchRows([{ rowId: row.id, selected: nextSelected }], rollback ?? undefined);
  };

  const handleCategoryChange = (row: StatementImportRow, categoryId: string) => {
    const rollback = preview;
    const cat = categories.find((c) => c.id === categoryId);
    updateRowLocal(row.id, {
      categoryId: categoryId || null,
      categoryName: cat?.name ?? row.categoryName,
    });
    void patchRows(
      [{ rowId: row.id, categoryId: categoryId || null }],
      rollback ?? undefined,
    );
  };

  const handleMemoChange = (row: StatementImportRow, memo: string) => {
    const rollback = preview;
    updateRowLocal(row.id, { memo });
    clearTimeout(memoPatchTimers.current[row.id]);
    memoPatchTimers.current[row.id] = setTimeout(() => {
      void patchRows([{ rowId: row.id, memo }], rollback ?? undefined);
    }, 300);
  };

  const importCount =
    preview?.rows.filter((r) => r.selected).length ?? 0;

  const categoriesForRow = (row: StatementImportRow) =>
    categories.filter((c) => c.type === row.direction);

  const handleConfirm = async () => {
    if (!preview || importCount === 0) return;
    setConfirming(true);
    setError(null);
    try {
      const rowIds = preview.rows.filter((r) => r.selected).map((r) => r.id);
      const res = await confirmStatementImport(preview.id, { rowIds });
      onSuccess?.(res.created);
      close();
    } catch (err) {
      const { gated, message } = gatedMessage(
        err,
        t("statementImport.gated"),
      );
      if (gated) {
        setUpgradeMessage(message);
        setUpgradeOpen(true);
      } else {
        setError(message || t("statementImport.confirmError"));
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (preview?.id) {
      try {
        await deleteStatementImport(preview.id);
      } catch {
        // закрываем даже при ошибке DELETE
      }
    }
    close();
  };

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label={t("statementImport.close")}
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={() => void handleCancel()}
        type="button"
      />
      <section
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-[var(--line)] bg-[var(--surface-1)] shadow-[0_-8px_40px_-12px_rgba(15,23,42,0.2)] md:my-4 md:rounded-2xl md:shadow-2xl ${
          step === "preview"
            ? "max-h-[92vh] md:max-h-[88vh] md:w-[min(96vw,56rem)]"
            : "max-h-[90vh] md:w-[min(92vw,28rem)]"
        }`}
      >
        <div className="mb-1 flex justify-center pt-3 md:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-[var(--surface-3)]" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 md:px-6">
          <div>
            <p className="metric-label">{t("statementImport.title")}</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              {step === "upload"
                ? t("statementImport.uploadStep")
                : t("statementImport.previewStep")}
            </h3>
          </div>
          <button
            className="tx-inline-btn"
            onClick={() => void handleCancel()}
            type="button"
          >
            {t("statementImport.close")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {step === "upload" ? (
            <div className="space-y-4">
              <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                {t("statementImport.selectAccount")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {loadingMeta ? (
                  <p className="col-span-full text-sm text-[var(--ink-muted)]">
                    {t("common.loading")}
                  </p>
                ) : accounts.length === 0 ? (
                  <p className="col-span-full text-sm text-[var(--ink-muted)]">
                    {t("statementImport.noAccount")}
                  </p>
                ) : (
                  accounts.map((acc) => (
                    <button
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        accountId === acc.id
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]"
                      }`}
                      key={acc.id}
                      onClick={() => setAccountId(acc.id)}
                      type="button"
                    >
                      {acc.name}
                    </button>
                  ))
                )}
              </div>

              <div
                className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                  dragOver
                    ? "border-[var(--accent)] bg-[var(--surface-2)]"
                    : "border-[var(--line)]"
                }`}
                onDragLeave={() => setDragOver(false)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  applyFile(e.dataTransfer.files?.[0] ?? null);
                }}
              >
                <p className="text-sm text-[var(--ink-soft)]">
                  {t("statementImport.dropHint")}
                </p>
                {file ? (
                  <p className="mono mt-2 text-sm font-medium text-[var(--ink-strong)]">
                    {file.name}
                  </p>
                ) : null}
                <button
                  className="filter-chip mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {t("statementImport.chooseFile")}
                </button>
                <input
                  accept={STATEMENT_ACCEPT}
                  className="hidden"
                  onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
                  ref={fileInputRef}
                  type="file"
                />
              </div>

              {error ? <div className="alert alert-warn">{error}</div> : null}

              <button
                className="action-btn w-full"
                disabled={uploading || !file || !accountId}
                onClick={() => void handleUpload()}
                type="button"
              >
                {uploading
                  ? t("statementImport.analyzing")
                  : t("statementImport.analyze")}
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
                <span>
                  {t("statementImport.bank")}:{" "}
                  <strong className="text-[var(--ink-strong)]">
                    {preview.bank.name}
                  </strong>
                </span>
                <span>
                  {t("statementImport.period")}: {preview.period.from} —{" "}
                  {preview.period.to}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-1">
                  {t("statementImport.statsTotal")}: {preview.stats.total}
                </span>
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-1">
                  {t("statementImport.statsDuplicates")}:{" "}
                  {preview.stats.duplicates}
                </span>
                {preview.stats.parseErrors > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">
                    {t("statementImport.statsErrors")}:{" "}
                    {preview.stats.parseErrors}
                  </span>
                ) : null}
              </div>

              {patchError ? (
                <div className="alert alert-warn">{patchError}</div>
              ) : null}
              {error ? <div className="alert alert-warn">{error}</div> : null}

              <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                    <tr>
                      <th className="w-10 px-2 py-2" />
                      <th className="px-2 py-2">{t("statementImport.colDate")}</th>
                      <th className="px-2 py-2">{t("statementImport.colAmount")}</th>
                      <th className="px-2 py-2">{t("statementImport.colMemo")}</th>
                      <th className="px-2 py-2">{t("statementImport.colCategory")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr
                        className={`border-t border-[var(--line)] ${
                          row.duplicate ? "opacity-70" : ""
                        }`}
                        key={row.id}
                      >
                        <td className="px-2 py-2 align-top">
                          <input
                            checked={row.selected}
                            disabled={patching}
                            onChange={() => handleToggleSelected(row)}
                            type="checkbox"
                          />
                        </td>
                        <td className="mono whitespace-nowrap px-2 py-2 align-top text-xs">
                          {row.date}
                        </td>
                        <td
                          className={`mono whitespace-nowrap px-2 py-2 align-top text-xs ${
                            row.amountMinor >= 0
                              ? "text-[#166534]"
                              : "text-[#9f1239]"
                          }`}
                        >
                          {formatMoney(row.amount)}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className="w-full min-w-[120px] rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs"
                            disabled={patching}
                            onChange={(e) => handleMemoChange(row, e.target.value)}
                            value={row.memo ?? ""}
                          />
                          {row.duplicate ? (
                            <span className="mt-1 inline-block rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] uppercase">
                              {t("statementImport.duplicateBadge")}
                            </span>
                          ) : null}
                          {row.parseWarning ? (
                            <span className="mt-1 block text-[10px] text-amber-700">
                              {row.parseWarning}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select
                            className="w-full min-w-[100px] rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs"
                            disabled={patching}
                            onChange={(e) =>
                              handleCategoryChange(row, e.target.value)
                            }
                            value={row.categoryId ?? ""}
                          >
                            <option value="">—</option>
                            {categoriesForRow(row).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {step === "preview" ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-4 py-4 sm:flex-row sm:justify-end md:px-6">
            <button
              className="filter-chip w-full sm:w-auto"
              disabled={confirming}
              onClick={() => void handleCancel()}
              type="button"
            >
              {t("statementImport.cancel")}
            </button>
            <button
              className="action-btn w-full sm:w-auto"
              disabled={confirming || patching || importCount === 0}
              onClick={() => void handleConfirm()}
              type="button"
            >
              {confirming
                ? t("statementImport.importing")
                : t("statementImport.importCount").replace(
                    "{count}",
                    String(importCount),
                  )}
            </button>
          </div>
        ) : null}
      </section>

      <UpgradeModal
        message={upgradeMessage}
        onClose={() => setUpgradeOpen(false)}
        open={upgradeOpen}
      />
    </div>
  );

  return createPortal(content, document.body);
});
