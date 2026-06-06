"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Account, Category, SuggestCategoryResponse } from "@/shared/api";
import {
  createTransaction,
  getAccounts,
  getCategories,
  receiptOcrTransaction,
  suggestCategoryTransaction,
  voiceParseTransaction,
} from "@/shared/api";
import { useI18n } from "@/shared/i18n";

const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp";
const RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type AddTransactionModalProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
};

export type AddTransactionModalHandle = {
  open: () => void;
  /** Открыть модалку и сразу показать выбор фото чека */
  openWithReceipt: () => void;
};

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

/**
 * Отображение суммы: целая часть с пробелами по тысячам; дробная (до 2 знаков) сохраняется.
 * Раньше все нецифры выкидывались — точка терялась, «12.50» превращалось в «1 250».
 */
function formatAmountDisplay(value: string): string {
  const v = value.replace(/,/g, ".").trim();
  if (!v || v === ".") return "0";
  const dot = v.indexOf(".");
  const intSlice = dot === -1 ? v : v.slice(0, dot);
  const fracSlice = dot === -1 ? "" : v.slice(dot + 1);
  const intDigits = intSlice.replace(/\D/g, "");
  const fracDigits = fracSlice.replace(/\D/g, "").slice(0, 2);
  const intTrimmed =
    intDigits.replace(/^0+(?=\d)/, "") ||
    (fracDigits.length > 0 ? "0" : intDigits ? "0" : "");
  const intCore =
    intTrimmed === "" && intDigits.length === 0 ? "0" : intTrimmed || "0";
  const grouped = intCore.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (dot !== -1) {
    if (fracDigits.length > 0) return `${grouped}.${fracDigits}`;
    if (v.endsWith(".")) return `${grouped}.`;
  }
  return grouped;
}

/**
 * Бэкенд иногда отдаёт сумму в тиынах (×100), а в фразе пользователь указал целые ₸
 * (например «еда 545» → amountMinor 54500 → на экране «54 500»). Если в подсказке есть
 * число p и whole === p*100, считаем p суммой в ₸ (см. docs/AMOUNTS_API.md).
 */
function applyHintDeTiyn(whole: number, hint?: string | null): number {
  if (!hint || whole < 100 || whole % 100 !== 0) return whole;
  const tokens = hint.match(/\d+/g);
  if (!tokens?.length) return whole;
  for (const t of tokens) {
    const p = Number(t);
    if (!Number.isFinite(p) || p <= 0) continue;
    if (whole === p * 100) return p;
  }
  return whole;
}

/** Целые ₸ для поля шага 1; hint — текст фразы (voice) или memo (чек), чтобы снять ×100. */
function amountFromAiToInputRaw(
  amount: unknown,
  phraseHint?: string | null,
): string {
  const n =
    typeof amount === "number" && Number.isFinite(amount)
      ? amount
      : typeof amount === "string"
        ? Number(String(amount).replace(/\s/g, "").replace(",", "."))
        : NaN;
  if (!Number.isFinite(n)) return "";
  let whole = Math.trunc(Math.abs(n));
  if (whole === 0) return "";
  whole = applyHintDeTiyn(whole, phraseHint);
  const trimmed = String(whole).replace(/^0+/, "") || "0";
  return trimmed === "0" ? "" : trimmed;
}

const AddTransactionModalInner = forwardRef<
  AddTransactionModalHandle,
  AddTransactionModalProps
>(function AddTransactionModal(
  { triggerLabel, triggerClassName = "fab-add", onSuccess },
  ref,
) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [openReceiptPicker, setOpenReceiptPicker] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [voiceText, setVoiceText] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] =
    useState<SuggestCategoryResponse | null>(null);

  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setFormError(null);
    Promise.all([getCategories(), getAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats ?? []);
        setAccounts(accs ?? []);
        setCategoryId((prev) => prev ?? cats?.[0]?.id ?? null);
        setAccountId((prev) => prev ?? accs?.[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    setStep(1);
    setAmountRaw("");
    setComment("");
    setFormError(null);
    setVoiceText("");
    setVoiceError(null);
    setLowConfidence(false);
    setSuggestResult(null);
    setSuggestError(null);
    setReceiptError(null);
    setTransactionDate(new Date().toISOString().slice(0, 10));
  };

  const openModal = () => {
    setIsOpen(true);
    setStep(1);
  };

  const openWithReceipt = () => {
    setOpenReceiptPicker(true);
    setIsOpen(true);
    setStep(1);
  };

  useImperativeHandle(ref, () => ({
    open: openModal,
    openWithReceipt,
  }));

  useEffect(() => {
    if (isOpen && openReceiptPicker && !receiptLoading) {
      const t = setTimeout(() => {
        receiptInputRef.current?.click();
        setOpenReceiptPicker(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, openReceiptPicker, receiptLoading]);

  const handleVoiceParse = async () => {
    const text = voiceText.trim();
    if (!text) return;
    setVoiceError(null);
    setVoiceLoading(true);
    setLowConfidence(false);
    try {
      const res = await voiceParseTransaction({ text });
      setAmountRaw(amountFromAiToInputRaw(res.amountMinor, text));
      if (res.categoryId && categories.some((c) => c.id === res.categoryId)) {
        setCategoryId(res.categoryId);
      }
      if (res.accountId && accounts.some((a) => a.id === res.accountId)) {
        setAccountId(res.accountId);
      }
      setComment(res.memo ?? "");
      setTransactionDate(res.date ?? new Date().toISOString().slice(0, 10));
      setLowConfidence(res.confidence < 0.7);
      setStep(2);
    } catch (err) {
      setVoiceError((err as Error)?.message ?? t("transactions.add.voiceError"));
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleSuggestCategory = async () => {
    const memo = comment.trim().slice(0, 500);
    if (!memo) return;
    setSuggestError(null);
    setSuggestResult(null);
    setSuggestLoading(true);
    try {
      const category = categories.find((c) => c.id === categoryId);
      const isIncome = category?.type === "income";
      const amountMinor = hasAmount
        ? isIncome
          ? Math.round(amountNum)
          : -Math.round(amountNum)
        : undefined;
      const res = await suggestCategoryTransaction({ memo, amountMinor });
      setSuggestResult(res);
    } catch (err) {
      setSuggestError(
        (err as Error)?.message ?? t("transactions.add.suggestError"),
      );
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestCategory = () => {
    if (
      !suggestResult?.categoryId ||
      !categories.some((c) => c.id === suggestResult.categoryId)
    )
      return;
    setCategoryId(suggestResult.categoryId);
    if (suggestResult.merchantCanonical) {
      setComment(suggestResult.merchantCanonical);
    }
    setSuggestResult(null);
    setStep(2);
  };

  const handleReceiptOcr = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setReceiptError(t("transactions.add.receiptTypeError"));
      return;
    }
    if (file.size > RECEIPT_MAX_SIZE_BYTES) {
      setReceiptError(t("transactions.add.receiptSizeError"));
      return;
    }
    setReceiptError(null);
    setReceiptLoading(true);
    try {
      const res = await receiptOcrTransaction(file);
      const raw = amountFromAiToInputRaw(res.amountMinor, res.memo);
      if (raw.length > 0) {
        setAmountRaw(raw);
      }
      if (res.date) setTransactionDate(res.date);
      if (res.memo) setComment(res.memo);
      if (res.categoryId && categories.some((c) => c.id === res.categoryId)) {
        setCategoryId(res.categoryId);
      }
      setStep(2);
    } catch (err) {
      setReceiptError((err as Error)?.message ?? t("transactions.add.receiptError"));
    } finally {
      setReceiptLoading(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  const onReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReceiptOcr(file);
  };

  const onKeypad = (key: string) => {
    if (key === "⌫") {
      setAmountRaw((prev) => {
        const p = prev.replace(/,/g, ".").replace(/\s/g, "");
        if (!p) return "";
        return p.slice(0, -1);
      });
      return;
    }
    if (key === ".") {
      setAmountRaw((prev) => {
        const p = prev.replace(/,/g, ".").replace(/\s/g, "");
        if (p.includes(".")) return prev;
        return p === "" ? "0." : `${p}.`;
      });
      return;
    }
    setAmountRaw((prev) => {
      const p = prev.replace(/,/g, ".").replace(/\s/g, "");
      if (p.includes(".")) {
        const [, frac = ""] = p.split(".");
        if (frac.replace(/\D/g, "").length >= 2) return prev;
      }
      if (p === "0") return key;
      return `${p}${key}`;
    });
  };

  const amountDisplay = formatAmountDisplay(amountRaw || "0");
  const amountNum = parseFloat(
    (amountRaw || "0").replace(/\s/g, "").replace(",", "."),
  );
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const hasAccount = accounts.length > 0 && accountId != null;
  const canSubmit = hasAmount && categoryId != null && hasAccount;
  const submitBlockReason =
    step === 3 &&
    !canSubmit &&
    (hasAmount
      ? hasAccount
        ? null
        : accounts.length === 0
          ? t("transactions.add.noAccountHint")
          : t("transactions.add.selectAccount")
      : t("transactions.add.enterAmount"));

  const handleSubmit = async () => {
    if (!canSubmit || !categoryId || !accountId) return;
    const category = categories.find((c) => c.id === categoryId);
    // Доход — положительная сумма, расход — отрицательная. API принимает сумму в целых единицах (₸), не в тиынах.
    const isIncome = category?.type === "income";
    const amountMinor = isIncome
      ? Math.round(amountNum)
      : -Math.round(amountNum);
    setSubmitting(true);
    setFormError(null);
    try {
      const memo = comment.trim().slice(0, 2000) || undefined;
      await createTransaction({
        accountId,
        categoryId,
        amountMinor,
        date: transactionDate,
        memo,
      });
      onSuccess?.();
      closeModal();
    } catch (err) {
      setFormError(
        (err as Error)?.message ?? t("transactions.add.saveError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = isOpen && typeof document !== "undefined" && (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label={t("transactions.add.closeAria")}
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={closeModal}
        type="button"
      />

      <section className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[620px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">{t("transactions.add.title")}</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              {t("transactions.add.steps")}
            </h3>
          </div>
          <button className="tx-inline-btn" onClick={closeModal} type="button">
            {t("common.close")}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            {t("transactions.add.smartInput")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            {t("transactions.add.smartInputHint")}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-muted)]"
              placeholder={t("transactions.add.smartInputPlaceholder")}
              type="text"
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVoiceParse()}
              disabled={voiceLoading}
            />
            <button
              type="button"
              className="action-btn shrink-0 px-4"
              onClick={handleVoiceParse}
              disabled={voiceLoading || loading || !voiceText.trim()}
            >
              {voiceLoading ? "…" : t("transactions.add.recognize")}
            </button>
          </div>
          {voiceError && (
            <p className="mt-2 text-sm text-[#9f1239]">{voiceError}</p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            {t("transactions.add.receiptAi")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            {t("transactions.add.receiptAiHint")}
          </p>
          <input
            ref={receiptInputRef}
            type="file"
            accept={RECEIPT_ACCEPT}
            className="sr-only"
            aria-hidden
            onChange={onReceiptFileChange}
            disabled={receiptLoading}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="action-btn shrink-0 px-4"
              onClick={() => receiptInputRef.current?.click()}
              disabled={receiptLoading || loading}
            >
              {receiptLoading ? t("transactions.add.receiptRecognizing") : t("transactions.add.pickReceipt")}
            </button>
          </div>
          {receiptError && (
            <p className="mt-2 text-sm text-[#9f1239]">{receiptError}</p>
          )}
        </div>

        {lowConfidence && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t("transactions.add.lowConfidence")}
          </div>
        )}

        <div className="mb-4 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((current) => (
            <button
              className={`tx-step ${step === current ? "active" : ""}`}
              key={current}
              onClick={() => setStep(current)}
              type="button"
            >
              <span>{current}</span>
              {current === 1 ? t("transactions.add.amount") : current === 2 ? t("transactions.add.category") : t("transactions.add.account")}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="mono text-xs text-[var(--ink-muted)]">
                {t("transactions.add.amount")}{" "}
                {categoryId
                  ? categories.find((c) => c.id === categoryId)?.type ===
                    "income"
                    ? t("transactions.add.amountIncome")
                    : t("transactions.add.amountExpense")
                  : ""}
              </p>
              <p className="mono mt-1 text-3xl font-semibold text-[var(--ink-strong)]">
                {amountDisplay} ₸
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {keypad.map((key) => (
                <button
                  className="rounded-xl border border-[var(--line)] bg-white py-3 text-sm font-semibold text-[var(--ink-strong)]"
                  key={key}
                  onClick={() => onKeypad(key)}
                  type="button"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {loading ? (
              <p className="col-span-full text-sm text-[var(--ink-muted)]">
                {t("transactions.add.loadingCategories")}
              </p>
            ) : (
              categories.map((cat) => (
                <button
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    categoryId === cat.id
                      ? "border-[#0f172a] bg-[#0f172a] text-white"
                      : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]"
                  }`}
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  type="button"
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="auth-field">
              <span>{t("transactions.add.transactionDate")}</span>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-strong)]"
              />
            </label>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              {categories.find((c) => c.id === categoryId)?.type === "income"
                ? t("transactions.add.accountCredit")
                : t("transactions.add.accountDebit")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {loading ? (
                <p className="col-span-full text-sm text-[var(--ink-muted)]">
                  {t("transactions.add.loadingAccounts")}
                </p>
              ) : accounts.length === 0 ? (
                <p className="col-span-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {t("transactions.add.noAccountsHint")}
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
            <label className="auth-field">
              <span>{t("transactions.add.comment")}</span>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("transactions.add.commentPlaceholder")}
                type="text"
                maxLength={2000}
              />
            </label>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                {t("transactions.add.suggestAi")}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                {t("transactions.add.suggestAiHint")}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="action-btn shrink-0 px-4"
                  onClick={handleSuggestCategory}
                  disabled={suggestLoading || !comment.trim()}
                >
                  {suggestLoading ? "…" : t("transactions.add.suggest")}
                </button>
              </div>
              {suggestError && (
                <p className="mt-2 text-sm text-[#9f1239]">{suggestError}</p>
              )}
              {suggestResult && (
                <div className="mt-3 rounded-lg border border-[var(--line)] bg-white p-3">
                  <p className="text-sm font-semibold text-[var(--ink-strong)]">
                    {suggestResult.categoryName}
                    {suggestResult.merchantCanonical && (
                      <span className="ml-1.5 font-normal text-[var(--ink-soft)]">
                        — {suggestResult.merchantCanonical}
                      </span>
                    )}
                  </p>
                  {suggestResult.confidence < 0.7 && (
                    <p className="mt-1 text-xs text-[#92400e]">
                      {t("transactions.add.suggestCheck")}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="action-btn h-8 px-3 text-sm"
                      onClick={applySuggestCategory}
                      disabled={
                        !suggestResult.categoryId ||
                        !categories.some(
                          (c) => c.id === suggestResult!.categoryId,
                        )
                      }
                    >
                      {t("transactions.add.applySuggest")}
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn h-8 px-3 text-sm"
                      onClick={() => {
                        setSuggestResult(null);
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {formError && <div className="mt-3 alert alert-warn">{formError}</div>}

        {submitBlockReason && (
          <p className="mt-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-muted)]">
            {submitBlockReason}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            className="filter-chip"
            disabled={step === 1}
            onClick={() =>
              setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))
            }
            type="button"
          >
            {t("transactions.add.back")}
          </button>
          {step < 3 ? (
            <button
              className="action-btn"
              onClick={() =>
                setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
              }
              type="button"
            >
              {t("transactions.add.next")}
            </button>
          ) : (
            <button
              className={`action-btn ${!canSubmit || submitting ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              type="button"
              disabled={!canSubmit || submitting}
              title={
                typeof submitBlockReason === "string"
                  ? submitBlockReason
                  : undefined
              }
            >
              {submitting ? t("common.saving") : t("transactions.add.save")}
            </button>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button className={triggerClassName} onClick={openModal} type="button">
        {triggerLabel ?? t("transactions.add.trigger")}
      </button>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
});

export { AddTransactionModalInner as AddTransactionModal };
