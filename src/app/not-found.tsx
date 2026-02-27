import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />
      <main className="mx-auto flex min-h-screen w-full max-w-[780px] items-center px-4 py-8">
        <section className="card w-full p-7 text-center md:p-9">
          <p className="metric-label">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink-strong)]">
            Страница не найдена
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Возможно, ссылка устарела или страница была перемещена.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link className="action-btn" href="/">
              На главную
            </Link>
            <Link className="filter-chip" href="/profile">
              В профиль
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
