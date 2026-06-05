"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  getHouseholdBudgets,
  updateHouseholdBudget,
} from "@/shared/api";
import type { Household, HouseholdBudget } from "@/shared/api";
import { useI18n } from "@/shared/i18n";
import { useBodyScrollLock } from "@/shared/lib";
import {
  formatAmountInput,
  formatMoneyValue,
  parseLimitMinorInput,
} from "@/features/household/lib/format";

type FamilyBudgetsTabProps = {
  household: Household;
  canManage: boolean;
};

export function FamilyBudgetsTab({ household, canManage }: FamilyBudgetsTabProps) {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState<HouseholdBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<HouseholdBudget | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formCurrency, setFormCurrency] = useState("KZT");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useBodyScrollLock(modalOpen || editBudget !== null || deleteId !== null);

  const load = useCallback(() => {
    setLoading(true);
    getHouseholdBudgets()
      .then(setBudgets)
      .catch((err) => setError((err as Error)?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (household.id) load();
  }, [household.id, load]);

  const openCreate = () => {
    setFormName("");
    setFormCategory("");
    setFormLimit("");
    setFormCurrency("KZT");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (b: HouseholdBudget) => {
    setEditBudget(b);
    setFormName(b.name);
    setFormCategory(b.categoryName);
    setFormLimit(formatAmountInput(String(b.limitMinor)));
    setFormCurrency(b.currency || "KZT");
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitMinor = parseLimitMinorInput(formLimit);
    if (!formName.trim() || !formCategory.trim() || limitMinor <= 0) {
      setFormError("Заполните все поля");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editBudget) {
        await updateHouseholdBudget(editBudget.id, {
          name: formName.trim(),
          categoryName: formCategory.trim(),
          limitMinor,
          currency: formCurrency,
        });
        setEditBudget(null);
      } else {
        await createHouseholdBudget({
          name: formName.trim(),
          categoryName: formCategory.trim(),
          limitMinor,
          currency: formCurrency,
        });
        setModalOpen(false);
      }
      load();
    } catch (err) {
      setFormError((err as Error)?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await deleteHouseholdBudget(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      setFormError((err as Error)?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const formOpen = modalOpen || editBudget !== null;

  return (
    <>
      <article className="card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("family.budgets.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{t("family.budgets.hint")}</p>
          </div>
          {canManage && (
            <button className="action-btn" type="button" onClick={openCreate}>
              {t("family.budgets.add")}
            </button>
          )}
        </div>

        {loading && (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("common.loading")}</p>
        )}
        {error && <div className="alert alert-warn mt-4">{error}</div>}
        {!loading && budgets.length === 0 && (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">{t("family.budgets.empty")}</p>
        )}

        <ul className="mt-4 space-y-3">
          {budgets.map((b) => {
            const spent =
              typeof b.spent === "number"
                ? b.spent
                : typeof b.spent === "object" && b.spent && "amount_minor" in b.spent
                  ? (b.spent as { amount_minor: number }).amount_minor
                  : b.spent_minor ?? 0;
            const pct = b.progress_percent ?? (b.limitMinor > 0 ? (spent / b.limitMinor) * 100 : 0);
            return (
              <li
                key={b.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--ink-strong)]">{b.name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{b.categoryName}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        className="tx-inline-btn h-8 px-2 text-xs"
                        type="button"
                        onClick={() => openEdit(b)}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        className="tx-inline-btn danger h-8 px-2 text-xs"
                        type="button"
                        onClick={() => setDeleteId(b.id)}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                    <span>
                      {t("family.budgets.spent")}: {formatMoneyValue(typeof b.spent === "object" ? b.spent as never : undefined) || spent}
                    </span>
                    <span>
                      {t("family.budgets.limit")}: {formatAmountInput(String(b.limitMinor))} {b.currency}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-[#9f1239]" : pct >= 85 ? "bg-[#b45309]" : "bg-[#1e293b]"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      {formOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => {
              setModalOpen(false);
              setEditBudget(null);
            }}
            type="button"
          />
          <section className="relative z-10 w-full max-w-md rounded-t-2xl border border-[var(--line)] bg-white p-5 md:rounded-2xl">
            <h3 className="text-lg font-semibold">
              {editBudget ? t("family.budgets.editTitle") : t("family.budgets.createTitle")}
            </h3>
            <form className="mt-4 grid gap-3" onSubmit={(e) => void handleSubmit(e)}>
              {formError && <div className="alert alert-warn">{formError}</div>}
              <label className="auth-field">
                <span>{t("family.budgets.name")}</span>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </label>
              <label className="auth-field">
                <span>{t("family.budgets.categoryName")}</span>
                <input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Еда"
                  required
                />
              </label>
              <label className="auth-field">
                <span>{t("family.budgets.limit")}</span>
                <input
                  inputMode="numeric"
                  value={formLimit}
                  onChange={(e) => setFormLimit(formatAmountInput(e.target.value))}
                  required
                />
              </label>
              <div className="flex gap-2">
                <button
                  className="tx-inline-btn flex-1"
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditBudget(null);
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button className="action-btn flex-1" disabled={submitting} type="submit">
                  {submitting ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[82] flex items-center justify-center p-4">
          <button
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDeleteId(null)}
            type="button"
          />
          <section className="relative z-10 w-full max-w-sm rounded-2xl border bg-white p-5">
            <p className="font-medium">{t("common.delete")}?</p>
            <div className="mt-4 flex gap-2">
              <button className="tx-inline-btn flex-1" onClick={() => setDeleteId(null)} type="button">
                {t("common.cancel")}
              </button>
              <button
                className="action-btn flex-1 bg-[#9f1239]"
                disabled={submitting}
                onClick={() => void handleDelete()}
                type="button"
              >
                {t("common.delete")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
