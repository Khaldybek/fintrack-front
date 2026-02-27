import type { Metadata } from "next";
import "@/app/styles/globals.css";
import { AuthProvider } from "./providers/auth-provider";

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
    <html lang="ru">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
