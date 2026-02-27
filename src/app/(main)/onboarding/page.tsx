import Link from "next/link";
import { AppShell } from "@/widgets/app-shell";

const steps = [
  {
    title: "Добавьте счета",
    desc: "Подключите карты, наличные и накопительные счета.",
  },
  {
    title: "Задайте бюджет",
    desc: "Установите лимиты по ключевым категориям расходов.",
  },
  {
    title: "Настройте цель",
    desc: "Выберите цель накопления и срок достижения.",
  },
  {
    title: "Включите прогноз",
    desc: "Следите за риском кассового разрыва до зарплаты.",
  },
];

export default function OnboardingPage() {
  return (
    <AppShell
      active="dashboard"
      title="Быстрый старт"
      subtitle="4 шага, чтобы получить первые полезные инсайты за сегодня."
      eyebrow="FinTrack Onboarding"
    >
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {steps.map((item, index) => (
          <article key={item.title} className="card p-5 md:p-6">
            <p className="metric-label">Шаг {index + 1}</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.desc}</p>
            <button
              className="mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)]"
              type="button"
            >
              Выполнить
            </button>
          </article>
        ))}
      </section>

      <div className="mt-5 flex justify-end">
        <Link className="action-btn" href="/">
          Перейти в Dashboard
        </Link>
      </div>
    </AppShell>
  );
}
