import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AuthSessionBridge from "@/components/auth/AuthSessionBridge";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { getDefaultLanguageForHostname, toHtmlLanguageTag } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "3DSFERA",
  description: "Иммерсивная выставочная платформа для покупателей и поставщиков",
};

const normalizeHostname = (host: string | null) => {
  const firstHost = host?.split(",")[0]?.trim();
  if (!firstHost) return null;

  try {
    return new URL(`https://${firstHost}`).hostname;
  } catch {
    return firstHost.split(":")[0] ?? null;
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const hostname = normalizeHostname(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const defaultLanguage = getDefaultLanguageForHostname(hostname);

  return (
    <html lang={toHtmlLanguageTag(defaultLanguage)}>
      <body
        className="antialiased"
      >
        <LanguageProvider defaultLanguage={defaultLanguage}>
          <AuthSessionBridge />
          <LanguageSwitcher />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
