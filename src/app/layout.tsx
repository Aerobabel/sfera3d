import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AuthSessionBridge from "@/components/auth/AuthSessionBridge";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { getDefaultLanguageForHostname, toHtmlLanguageTag } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif — used for pavilion names and exhibition-style
// headings to lift the catalogue beyond a generic e-commerce look.
const cormorantDisplay = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantDisplay.variable} antialiased`}
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
