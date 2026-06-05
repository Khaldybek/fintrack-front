"use client";

import Link from "next/link";
import { ROUTES } from "@/shared/config";

export type UpgradeModalProps = {
  open: boolean;
  message: string;
  featureCode?: string;
  onClose: () => void;
};

export function UpgradeModal({
  open,
  message,
  onClose,
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <section className="absolute left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl md:p-6">
        <p className="metric-label">FinTrack</p>
        <h3 className="mt-1 text-xl font-semibold text-[var(--ink-strong)]">
          Нужен платный тариф
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className="filter-chip" onClick={onClose} type="button">
            Закрыть
          </button>
          <Link className="action-btn" href={ROUTES.pricing} onClick={onClose}>
            Смотреть тарифы
          </Link>
        </div>
      </section>
    </div>
  );
}
