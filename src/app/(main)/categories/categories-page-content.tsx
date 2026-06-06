"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/widgets/app-shell";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/shared/api";
import type { Category, CategoryType } from "@/shared/api";
import { useI18n } from "@/shared/i18n";

const DEFAULT_COLORS = [
  "#0f172a", "#1e40af", "#166534", "#92400e",
  "#7c3aed", "#9f1239", "#0e7490", "#b45309",
];

/** Блок цвета или заглушка */
function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="h-4 w-4 rounded-full bg-[var(--surface-3)] border border-[var(--line)]" />;
  return <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

type FormState = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

const emptyForm = (): FormState => ({ name: "", type: "expense", icon: "", color: "" });

export function CategoriesPageContent() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CategoryType>("expense");

  const load = useCallback(() => {
    setLoading(true);
    return getCategories()
      .then(setCategories)
      .catch((err) => setError(err?.message ?? t("categories.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...emptyForm(), type: activeTab });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCategory(cat);
    setFormError(null);
    setForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon ?? "",
      color: cat.color ?? "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError(t("categories.nameRequired")); return; }
    setSubmitting(true);
    try {
      await createCategory({
        name: form.name.trim(),
        type: form.type,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
      });
      await load();
      setModalOpen(false);
    } catch (err) {
      setFormError((err as Error)?.message ?? t("categories.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    setFormError(null);
    if (!form.name.trim()) { setFormError(t("categories.nameRequired")); return; }
    setSubmitting(true);
    try {
      await updateCategory(editCategory.id, {
        name: form.name.trim(),
        type: form.type,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
      });
      await load();
      setEditCategory(null);
    } catch (err) {
      setFormError((err as Error)?.message ?? t("common.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      await load();
      setDeleteConfirmId(null);
    } catch {
      // silent
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const grouped = (type: CategoryType) =>
    categories.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder);

  const typeLabel = (type: CategoryType) =>
    type === "expense" ? t("categories.expense") : t("categories.income");

  if (loading) {
    return (
      <AppShell active="profile" title={t("categories.title")} subtitle={t("categories.subtitle")}>
        <div className="metric-label">{t("common.loading")}</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="profile" title={t("categories.title")} subtitle={t("categories.subtitle")}>
        <div className="alert alert-warn">{error}</div>
      </AppShell>
    );
  }

  const visibleList = grouped(activeTab);

  return (
    <>
      <AppShell
        active="profile"
        title={t("categories.title")}
        subtitle={t("categories.subtitle")}
        actionAs={
          <button className="action-btn" type="button" onClick={openCreate}>
            {t("categories.add")}
          </button>
        }
      >
        {/* Табы тип */}
        <div className="mb-5 flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1 w-fit">
          {(["expense", "income"] as CategoryType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === t ? "bg-white shadow text-[var(--ink-strong)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"}`}
              onClick={() => setActiveTab(t)}
            >
              {typeLabel(t)}
              <span className="ml-1.5 mono text-[10px] opacity-60">{grouped(t).length}</span>
            </button>
          ))}
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleList.length === 0 ? (
            <div className="card p-5 sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-[var(--ink-muted)]">
                {t("categories.emptyByType").replace(
                  "{type}",
                  typeLabel(activeTab).toLowerCase(),
                )}
              </p>
            </div>
          ) : (
            visibleList.map((cat) => (
              <article key={cat.id} className="card flex items-center gap-3 p-4">
                {/* Иконка / цветовая точка */}
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: cat.color ?? "var(--surface-3)" }}
                >
                  {cat.icon ? (
                    <span>{cat.icon}</span>
                  ) : (
                    <span className="text-xs font-bold text-white opacity-70">
                      {cat.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--ink-strong)]">{cat.name}</p>
                  <p className="mono text-xs text-[var(--ink-muted)]">
                    #{cat.sortOrder} · {typeLabel(cat.type)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    className="tx-inline-btn h-8 rounded-lg px-2.5 text-xs"
                    onClick={() => openEdit(cat)}
                  >
                    {t("categories.editShort")}
                  </button>
                  <button
                    type="button"
                    className="tx-inline-btn danger h-8 rounded-lg px-2.5 text-xs"
                    onClick={() => setDeleteConfirmId(cat.id)}
                  >
                    {t("categories.deleteShort")}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </AppShell>

      {/* Модал создания */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setModalOpen(false)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{t("categories.createTitle")}</h3>
              <button className="tx-inline-btn" type="button" onClick={() => setModalOpen(false)}>{t("common.close")}</button>
            </div>
            <CategoryForm
              form={form}
              setField={setField}
              onSubmit={handleCreate}
              submitting={submitting}
              error={formError}
              submitLabel={t("common.create")}
              onCancel={() => setModalOpen(false)}
            />
          </section>
        </div>
      )}

      {/* Модал редактирования */}
      {editCategory && (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setEditCategory(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[480px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                {t("categories.editWithName").replace("{name}", editCategory.name)}
              </h3>
              <button className="tx-inline-btn" type="button" onClick={() => setEditCategory(null)}>{t("common.close")}</button>
            </div>
            <CategoryForm
              form={form}
              setField={setField}
              onSubmit={handleEdit}
              submitting={submitting}
              error={formError}
              submitLabel={t("common.save")}
              onCancel={() => setEditCategory(null)}
            />
          </section>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[82]">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDeleteConfirmId(null)}
            type="button"
          />
          <section className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:bottom-1/2 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2 md:translate-y-1/2 md:rounded-2xl md:p-6">
            <p className="font-medium text-[var(--ink-strong)]">{t("categories.deleteConfirm")}</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("categories.deleteBody")}</p>
            <div className="mt-4 flex gap-2">
              <button
                className="action-btn flex-1 bg-[#9f1239] hover:bg-[#7f1d1d]"
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                {t("common.delete")}
              </button>
              <button className="tx-inline-btn flex-1" type="button" onClick={() => setDeleteConfirmId(null)}>
                {t("common.cancel")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

type CategoryFormProps = {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onCancel: () => void;
};

function CategoryForm({ form, setField, onSubmit, submitting, error, submitLabel, onCancel }: CategoryFormProps) {
  const { t } = useI18n();
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {error && <div className="alert alert-warn">{error}</div>}

      <label className="auth-field">
        <span>{t("categories.name")} <span className="text-[#9f1239]">*</span></span>
        <input
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder={t("categories.namePlaceholder")}
          maxLength={100}
          required
          autoComplete="off"
        />
      </label>

      <label className="auth-field">
        <span>{t("categories.type")}</span>
        <select value={form.type} onChange={(e) => setField("type", e.target.value as CategoryType)}>
          <option value="expense">{t("categories.expense")}</option>
          <option value="income">{t("categories.income")}</option>
        </select>
      </label>

      <label className="auth-field">
        <span>{t("categories.icon")}</span>
        <input
          value={form.icon}
          onChange={(e) => setField("icon", e.target.value)}
          placeholder={t("categories.iconPlaceholder")}
          maxLength={50}
          autoComplete="off"
        />
      </label>

      <div className="auth-field">
        <span>{t("categories.color")}</span>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: form.color === c ? "var(--ink-strong)" : "transparent",
              }}
              onClick={() => setField("color", c)}
              aria-label={c}
            />
          ))}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <ColorDot color={form.color || null} />
            <input
              type="color"
              value={form.color || "#000000"}
              onChange={(e) => setField("color", e.target.value)}
              className="h-0 w-0 opacity-0 absolute"
            />
            <span className="text-xs text-[var(--ink-muted)] underline">{t("categories.customColor")}</span>
          </label>
        </div>
        {form.color && (
          <div className="mt-2 flex items-center gap-2">
            <ColorDot color={form.color} />
            <span className="mono text-xs text-[var(--ink-muted)]">{form.color}</span>
            <button
              type="button"
              className="text-xs text-[var(--ink-muted)] underline"
              onClick={() => setField("color", "")}
            >
              {t("categories.resetColor")}
            </button>
          </div>
        )}
      </div>

      {/* Превью */}
      {(form.name || form.icon) && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="mb-2 text-xs text-[var(--ink-muted)]">{t("categories.preview")}</p>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: form.color || "var(--surface-3)" }}
            >
              {form.icon ? (
                <span>{form.icon}</span>
              ) : (
                <span className="text-xs font-bold text-white opacity-70">
                  {form.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-[var(--ink-strong)]">{form.name || t("categories.nameFallback")}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {form.type === "expense" ? t("categories.expense") : t("categories.income")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 flex gap-2">
        <button className="action-btn flex-1" type="submit" disabled={submitting}>
          {submitting ? t("common.saving") : submitLabel}
        </button>
        <button className="tx-inline-btn" type="button" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
