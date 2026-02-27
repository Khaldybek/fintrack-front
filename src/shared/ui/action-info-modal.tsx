"use client";

import { useState } from "react";

export type ActionInfoModalProps = {
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  description: string;
  items?: string[];
  confirmLabel?: string;
};

export function ActionInfoModal({
  triggerLabel,
  triggerClassName = "filter-chip",
  title,
  description,
  items,
  confirmLabel = "Понятно",
}: ActionInfoModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={triggerClassName}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[85]">
          <button
            aria-label="Закрыть окно"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            type="button"
          />

          <section className="absolute left-1/2 top-1/2 w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl md:p-6">
            <p className="metric-label">FinTrack</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--ink-strong)]">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              {description}
            </p>
            {items?.length ? (
              <ul className="mt-4 space-y-2">
                {items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink-muted)]" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="filter-chip"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Закрыть
              </button>
              <button
                className="action-btn"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
