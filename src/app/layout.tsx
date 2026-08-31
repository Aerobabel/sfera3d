import type { Metadata } from "next";
import { Bebas_Neue, Manrope, Noto_Sans_SC, Unbounded } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import AuthSessionBridge from "@/components/auth/AuthSessionBridge";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import CinematicInterface from "@/components/CinematicInterface";
import { getDefaultLanguageForHostname, toHtmlLanguageTag } from "@/lib/i18n";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  weight: "variable",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "3DSFERA",
  description: "Explore, play, earn rewards, and discover real-world products inside one living 3D city.",
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
    <html
      lang={toHtmlLanguageTag(defaultLanguage)}
      className={`${manrope.variable} ${unbounded.variable} ${bebasNeue.variable} ${notoSansSC.variable}`}
    >
      <body className="antialiased">
        <LanguageProvider defaultLanguage={defaultLanguage}>
          <AuthSessionBridge />
          <CinematicInterface />
          <LanguageSwitcher />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
