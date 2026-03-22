import type { Metadata } from "next";
import "@/app/styles/globals.css";
import { I18nProvider } from "@/shared/i18n";
import { AuthProvider } from "./providers/auth-provider";
import { DocumentLang } from "./providers/document-lang";

export const metadata: Metadata = {
  title: "FinTrack",
  description: "Financial literacy app dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        <I18nProvider>
          <DocumentLang />
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
