import { AuthGuard } from "./auth-guard";

/**
 * Layout для основной части приложения (страницы с AppShell).
 * Контент не рендерится и запросы не уходят, пока не завершена проверка сессии (refresh).
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
