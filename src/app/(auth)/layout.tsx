/**
 * Layout для группы маршрутов авторизации (login, register, forgot-password).
 * URL не меняются: /login, /register, /forgot-password.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
