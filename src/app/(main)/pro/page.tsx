import { AppShell } from "@/widgets/app-shell";

const features = [
  "Финансовый индекс с расшифровкой факторов",
  "Прогноз кассового разрыва и сценарии снижения риска",
  "Расширенная аналитика и сравнение периодов",
  "Подписки, автосписания и семейный режим",
];

export default function ProPage() {
  return (
    <AppShell
      active="profile"
      title="FinTrack Pro"
      subtitle="Расширенные инструменты для финансовой дисциплины и прогнозирования."
      actionLabel="Оформить Pro"
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <article className="card p-5 md:p-6">
          <p className="metric-label">Тариф</p>
          <p className="mono mt-2 text-3xl font-semibold text-[var(--ink-strong)]">
            ₸ 2 990 / месяц
          </p>
          <div className="mt-5 space-y-2">
            {features.map((feature) => (
              <div key={feature} className="alert">
                {feature}
              </div>
            ))}
          </div>
        </article>

        <aside className="flex flex-col gap-5">
          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              Почему это полезно
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Pro помогает заранее увидеть финансовые риски и вовремя
              скорректировать расходы без стресса.
            </p>
          </article>

          <article className="card p-5">
            <h2 className="text-base font-semibold text-[var(--ink-strong)]">
              Статус
            </h2>
            <div className="mt-4 space-y-2">
              <div className="metric-row">
                <span>Текущий план</span>
                <span className="mono">Free</span>
              </div>
              <div className="metric-row">
                <span>Пробный период</span>
                <span className="mono">7 дней</span>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
