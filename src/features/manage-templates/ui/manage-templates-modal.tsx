"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getTransactionTemplates,
  createTransactionTemplate,
  deleteTransactionTemplate,
  getCategories,
} from "@/shared/api";
import type { TransactionTemplate, Category } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { formatNumberLocale } from "@/shared/lib/format-locale";

export type ManageTemplatesModalProps = {
  onClose: () => void;
  onChanged?: () => void;
};

function formatTemplateAmount(
  tmpl: TransactionTemplate,
  locale: "ru" | "kk",
): string {
  if (typeof tmpl.amount === "object" && tmpl.amount !== null && "formatted" in tmpl.amount) {
    return tmpl.amount.formatted;
  }
  if (typeof tmpl.amount === "string" && tmpl.amount) return tmpl.amount;
  return `${formatNumberLocale(Math.abs(tmpl.amount_minor), locale)} ₸`;
}

export function ManageTemplatesModal({ onClose, onChanged }: ManageTemplatesModalProps) {
  const { t, locale } = useI18n();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getTransactionTemplates(), getCategories()])
      .then(([tmpl, cats]) => {
        setTemplates(tmpl ?? []);
        setCategories(cats ?? []);
        if (!categoryId && cats?.length) setCategoryId(cats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransactionTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      onChanged?.();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    const amountNum = parseFloat(amountRaw.replace(/\s/g, "").replace(",", ".")) || 0;
    if (!name.trim() || !categoryId || !Number.isFinite(amountNum) || amountNum <= 0) {
      setCreateError(t("templates.fillRequired"));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const tmpl = await createTransactionTemplate({
        name: name.trim(),
        categoryId,
        amountMinor: -Math.round(amountNum),
      });
      setTemplates((prev) => [...prev, tmpl]);
      setName("");
      setAmountRaw("");
      setShowCreate(false);
      onChanged?.();
    } catch (err) {
      setCreateError((err as Error)?.message ?? t("templates.createError"));
    } finally {
      setCreating(false);
    }
  };

  const content = typeof document !== "undefined" && (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label={t("common.close")}
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <section className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[520px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">{t("templates.label")}</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{t("templates.title")}</h3>
          </div>
          <button className="tx-inline-btn" onClick={onClose} type="button">
            {t("common.close")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
        ) : (
          <div className="space-y-2">
            {templates.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">{t("templates.empty")}</p>
            )}
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-strong)]">{tmpl.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {tmpl.category?.name ?? "—"} · {formatTemplateAmount(tmpl, locale)}
                  </p>
                </div>
                <button
                  className="tx-inline-btn danger shrink-0"
                  disabled={deletingId === tmpl.id}
                  onClick={() => handleDelete(tmpl.id)}
                  type="button"
                >
                  {deletingId === tmpl.id ? "…" : t("common.delete")}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Форма создания */}
        {showCreate ? (
          <div className="mt-4 space-y-3 rounded-xl border border-[var(--line)] p-3">
            <p className="text-sm font-semibold text-[var(--ink-strong)]">{t("templates.new")}</p>
            <label className="auth-field">
              <span>{t("templates.name")}</span>
              <input
                onChange={(e) => setName(e.target.value)}
                placeholder={t("templates.namePlaceholder")}
                type="text"
                value={name}
              />
            </label>
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-1">
                {t("templates.category")}
              </p>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-strong)]"
                onChange={(e) => setCategoryId(e.target.value)}
                value={categoryId}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="auth-field flex-1">
                <span>{t("templates.amount")}</span>
                <input
                  inputMode="numeric"
                  onChange={(e) => setAmountRaw(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  type="text"
                  value={amountRaw}
                />
              </label>
            </div>
            {createError && <div className="alert alert-warn">{createError}</div>}
            <div className="flex gap-2">
              <button
                className="filter-chip"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                }}
                type="button"
              >
                {t("common.cancel")}
              </button>
              <button
                className="action-btn"
                disabled={creating}
                onClick={handleCreate}
                type="button"
              >
                {creating ? t("common.creating") : t("templates.create")}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="mt-4 filter-chip w-full"
            onClick={() => setShowCreate(true)}
            type="button"
          >
            {t("templates.add")}
          </button>
        )}
      </section>
    </div>
  );

  return content ? createPortal(content, document.body) : null;
}
