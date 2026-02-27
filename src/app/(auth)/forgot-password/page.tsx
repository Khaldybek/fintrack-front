import Link from "next/link";
import { AuthShell } from "@/shared/ui";
import { ROUTES } from "@/shared/config";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Отправим ссылку для безопасного сброса пароля"
      helperText="Ссылка будет действовать ограниченное время. Мы также уведомим вас о каждом восстановлении."
    >
      <form action="#" className="space-y-3">
        <label className="auth-field">
          <span>Email</span>
          <input placeholder="name@email.com" type="email" />
        </label>
        <button className="auth-primary" type="submit">
          Отправить ссылку
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--ink-soft)]">
        Вспомнили пароль?{" "}
        <Link className="font-semibold" href={ROUTES.login}>
          Вернуться ко входу
        </Link>
      </p>
    </AuthShell>
  );
}
