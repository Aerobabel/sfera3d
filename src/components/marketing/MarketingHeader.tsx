'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingMotion from "@/components/marketing/MarketingMotion";
import { clearServerAuthSession } from "@/lib/auth/browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const PLAYER_ENTRY_HREF = "/login?role=player&next=%2Froles%3Fintro%3Dcity";

const copy = {
  en: {
    home: "Home",
    about: "About",
    discover: "Discover",
    earlyAccess: "Get early access",
    signOut: "Sign out",
  },
  ru: {
    home: "Главная",
    about: "О нас",
    discover: "Исследовать",
    earlyAccess: "Ранний доступ",
    signOut: "Выйти",
  },
  zh: {
    home: "首页",
    about: "关于",
    discover: "探索",
    earlyAccess: "抢先体验",
    signOut: "退出",
  },
} as const;

const routes = [
  { href: "/", key: "home" as const },
  { href: "/about", key: "about" as const },
  { href: "/discover", key: "discover" as const },
];

export default function MarketingHeader() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = copy[language];
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (isMounted) setViewerEmail(data.session?.user.email ?? null);
        })
        .catch(() => {});

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) setViewerEmail(session?.user.email ?? null);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      await clearServerAuthSession().catch(() => {});
      setViewerEmail(null);
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  return (
    <>
      <MarketingMotion />
      <header className="marketing-header sticky top-0 z-30 border-b border-white/10 bg-[#03050a]/90 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-16 max-w-[92rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="3DSFERA home">
          <BrandLogo size="sm" priority />
          <span className="text-sm font-black tracking-[0.15em] text-white">3DSFERA</span>
        </Link>

        <nav className="hidden h-16 items-stretch md:flex" aria-label="Main navigation">
          {routes.map((route) => {
            const active = route.href === "/" ? pathname === "/" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`relative flex items-center px-6 text-xs font-bold uppercase tracking-[0.16em] transition ${
                  active ? "text-white" : "text-white/50 hover:text-white"
                }`}
              >
                {t[route.key]}
                {active && (
                  <span className="absolute inset-x-5 bottom-0 h-0.5 bg-[var(--sfera-marketing-orange)] shadow-[0_0_14px_var(--sfera-marketing-orange)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {viewerEmail && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              title={viewerEmail}
              className="hidden border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-50 sm:inline-flex"
            >
              {t.signOut}
            </button>
          )}
          <Link
            href="/pre-register"
            className="bg-[var(--sfera-marketing-orange)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(255,90,25,0.24)] transition hover:bg-[#ff743b] sm:text-xs"
            style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
          >
            {t.earlyAccess}
          </Link>
        </div>
      </div>

      <nav className="flex items-center justify-center border-t border-white/[0.06] md:hidden" aria-label="Mobile navigation">
        {routes.map((route) => {
          const active = route.href === "/" ? pathname === "/" : pathname.startsWith(route.href);
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`relative px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] ${
                active ? "text-white" : "text-white/45"
              }`}
            >
              {t[route.key]}
              {active && <span className="absolute inset-x-3 bottom-0 h-px bg-[var(--sfera-marketing-orange)]" />}
            </Link>
          );
        })}
      </nav>
      </header>
    </>
  );
}
