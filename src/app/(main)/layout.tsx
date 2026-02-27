/**
 * Layout для основной части приложения (страницы с AppShell).
 * URL без префикса: /, /transactions, /analytics и т.д.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
