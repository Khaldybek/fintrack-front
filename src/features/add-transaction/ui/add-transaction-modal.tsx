"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import {
  getCategories,
  getAccounts,
  createTransaction,
  voiceParseTransaction,
  suggestCategoryTransaction,
  receiptOcrTransaction,
} from "@/shared/api";
import type { Category, Account, SuggestCategoryResponse } from "@/shared/api";

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

/** Только цифры + пробелы как разделитель тысяч при отображении */
function formatAmountDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const AddTransactionModalInner = forwardRef<
  AddTransactionModalHandle,
  AddTransactionModalProps
>(function AddTransactionModal(
  {
    triggerLabel = "+ Транзакция",
    triggerClassName = "fab-add",
    onSuccess,
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [openReceiptPicker, setOpenReceiptPicker] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const [suggestResult, setSuggestResult] = useState<SuggestCategoryResponse | null>(null);

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
        setCategoryId((prev) => (prev ?? cats?.[0]?.id ?? null));
        setAccountId((prev) => (prev ?? accs?.[0]?.id ?? null));
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
      const absMinor = Math.abs(res.amountMinor);
      setAmountRaw(String(Math.round(absMinor / 100)));
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
      setVoiceError((err as Error)?.message ?? "Не удалось распознать фразу");
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
        ? (isIncome ? Math.round(amountNum * 100) : -Math.round(amountNum * 100))
        : undefined;
      const res = await suggestCategoryTransaction({ memo, amountMinor });
      setSuggestResult(res);
    } catch (err) {
      setSuggestError((err as Error)?.message ?? "Не удалось подсказать категорию");
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestCategory = () => {
    if (!suggestResult?.categoryId || !categories.some((c) => c.id === suggestResult.categoryId)) return;
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
      setReceiptError("Допустимы только JPEG, PNG или WebP");
      return;
    }
    if (file.size > RECEIPT_MAX_SIZE_BYTES) {
      setReceiptError("Файл не более 10 МБ");
      return;
    }
    setReceiptError(null);
    setReceiptLoading(true);
    try {
      const res = await receiptOcrTransaction(file);
      const absMinor = Math.abs(res.amountMinor);
      if (absMinor > 0) {
        setAmountRaw(String(Math.round(absMinor / 100)));
      }
      if (res.date) setTransactionDate(res.date);
      if (res.memo) setComment(res.memo);
      if (res.categoryId && categories.some((c) => c.id === res.categoryId)) {
        setCategoryId(res.categoryId);
      }
      setStep(2);
    } catch (err) {
      setReceiptError((err as Error)?.message ?? "Не удалось распознать чек");
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
      setAmountRaw((prev) => prev.replace(/\D/g, "").slice(0, -1));
      return;
    }
    if (key === ".") {
      setAmountRaw((prev) => (prev.includes(".") ? prev : `${prev}.`));
      return;
    }
    setAmountRaw((prev) => (prev === "0" && key !== "." ? key : `${prev}${key}`));
  };

  const amountDisplay = formatAmountDisplay(amountRaw || "0");
  const amountNum = parseFloat((amountRaw || "0").replace(/\s/g, "").replace(",", "."));
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
          ? "Профиль → раздел «Счета» → кнопка «+ Добавить счёт»"
          : "Выберите счёт выше"
      : "Вернитесь на шаг 1 и введите сумму");

  const handleSubmit = async () => {
    if (!canSubmit || !categoryId || !accountId) return;
    const category = categories.find((c) => c.id === categoryId);
    // Доход — положительная сумма, расход — отрицательная. API принимает сумму в целых единицах (₸), не в тиынах.
    const isIncome = category?.type === "income";
    const amountMinor = isIncome ? Math.round(amountNum) : -Math.round(amountNum);
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
      setFormError((err as Error)?.message ?? "Не удалось сохранить транзакцию");
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = isOpen && typeof document !== "undefined" && (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end md:justify-center">
      <button
        aria-label="Закрыть модалку"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={closeModal}
        type="button"
      />

      <section className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-4 shadow-2xl md:max-h-[85vh] md:w-[620px] md:rounded-2xl md:p-6 md:my-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="metric-label">Добавить транзакцию</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
              3 шага: сумма → категория → счёт
            </h3>
          </div>
          <button
            className="tx-inline-btn"
            onClick={closeModal}
            type="button"
          >
            Закрыть
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            Умный ввод (AI)
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            Напишите или продиктуйте фразу, например: 1500 на такси вчера
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-muted)]"
              placeholder="1500 на такси вчера"
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
              {voiceLoading ? "…" : "Распознать"}
            </button>
          </div>
          {voiceError && (
            <p className="mt-2 text-sm text-[#9f1239]">{voiceError}</p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
            Чек по фото (AI)
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            Загрузите фото чека (JPEG, PNG или WebP, до 10 МБ) — подставятся сумма, дата, магазин и категория.
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
              {receiptLoading ? "Распознаём…" : "Выбрать фото чека"}
            </button>
          </div>
          {receiptError && (
            <p className="mt-2 text-sm text-[#9f1239]">{receiptError}</p>
          )}
        </div>

        {lowConfidence && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Проверьте распознанные данные перед сохранением.
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
              {current === 1 ? "Сумма" : current === 2 ? "Категория" : "Счёт"}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="mono text-xs text-[var(--ink-muted)]">
                Сумма {categoryId ? (categories.find((c) => c.id === categoryId)?.type === "income" ? "(доход)" : "(расход)") : ""}
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
              <p className="col-span-full text-sm text-[var(--ink-muted)]">Загрузка категорий…</p>
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
              <span>Дата операции</span>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-strong)]"
              />
            </label>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              {categories.find((c) => c.id === categoryId)?.type === "income" ? "Счёт зачисления" : "Счёт списания"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {loading ? (
                <p className="col-span-full text-sm text-[var(--ink-muted)]">Загрузка счетов…</p>
              ) : accounts.length === 0 ? (
                <p className="col-span-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Нет добавленных счетов. Откройте <strong>Профиль</strong> (внизу экрана) → блок «Счета» → кнопка «+ Добавить счёт». После добавления счёта кнопка «Сохранить» станет активной.
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
              <span>Комментарий (необязательно)</span>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: Yandex*Go Taxi"
                type="text"
                maxLength={2000}
              />
            </label>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="mono text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                Подсказка категории по описанию (AI)
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                Введите текст операции и нажмите «Подсказать» — категория и мерчант подставятся автоматически.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="action-btn shrink-0 px-4"
                  onClick={handleSuggestCategory}
                  disabled={suggestLoading || !comment.trim()}
                >
                  {suggestLoading ? "…" : "Подсказать"}
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
                    <p className="mt-1 text-xs text-[#92400e]">Проверьте перед сохранением.</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="action-btn h-8 px-3 text-sm"
                      onClick={applySuggestCategory}
                      disabled={!suggestResult.categoryId || !categories.some((c) => c.id === suggestResult!.categoryId)}
                    >
                      Подставить
                    </button>
                    <button
                      type="button"
                      className="tx-inline-btn h-8 px-3 text-sm"
                      onClick={() => { setSuggestResult(null); }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {formError && (
          <div className="mt-3 alert alert-warn">{formError}</div>
        )}

        {submitBlockReason && (
          <p className="mt-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-muted)]">
            {submitBlockReason}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            className="filter-chip"
            disabled={step === 1}
            onClick={() => setStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev))}
            type="button"
          >
            Назад
          </button>
          {step < 3 ? (
            <button
              className="action-btn"
              onClick={() => setStep((prev) => (prev < 3 ? (prev + 1) as 1 | 2 | 3 : prev))}
              type="button"
            >
              Далее
            </button>
          ) : (
            <button
              className={`action-btn ${!canSubmit || submitting ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              type="button"
              disabled={!canSubmit || submitting}
              title={typeof submitBlockReason === "string" ? submitBlockReason : undefined}
            >
              {submitting ? "Сохранение…" : "Сохранить"}
            </button>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button className={triggerClassName} onClick={openModal} type="button">
        {triggerLabel}
      </button>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
});

export { AddTransactionModalInner as AddTransactionModal };
