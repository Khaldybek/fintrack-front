import { AppShell } from "@/widgets/app-shell";

export default function NotificationsPage() {
  return (
    <AppShell
      active="profile"
      title="Уведомления"
      subtitle="Только важные события: риски, лимиты и персональные подсказки."
    >
      <section className="grid grid-cols-1 gap-3">
        <article className="card p-5 md:p-6">
          <p className="text-sm text-[var(--ink-muted)]">
            Уведомлений пока нет.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
