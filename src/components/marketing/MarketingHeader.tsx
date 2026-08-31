'use client';

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import MarketingMotion from "@/components/marketing/MarketingMotion";

export const PLAYER_ENTRY_HREF = "/login?role=player&next=%2Froles%3Fintro%3Dcity";

const copy = {
  en: {
    explore: "Explore",
    play: "Play",
    discover: "Discover",
    about: "About",
    contact: "Contact",
    earlyAccess: "Get Early Access",
  },
  ru: {
    explore: "Исследовать",
    play: "Играть",
    discover: "Открывать",
    about: "О нас",
    contact: "Контакты",
    earlyAccess: "Ранний доступ",
  },
  zh: {
    explore: "探索",
    play: "游玩",
    discover: "发现",
    about: "关于",
    contact: "联系",
    earlyAccess: "抢先体验",
  },
} as const;

const routes = [
  { href: "/#explore", key: "explore" as const },
  { href: "/#play", key: "play" as const },
  { href: "/#discover", key: "discover" as const },
  { href: "/#about", key: "about" as const },
  { href: "/#contact", key: "contact" as const },
];

export default function MarketingHeader() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <>
      <MarketingMotion />
      <header className="marketing-header sticky top-3 z-50 mx-auto w-[calc(100%_-_1rem)] max-w-[1600px] rounded-[1.6rem] border border-sky-100/30 bg-[#050914]/78 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:top-5 sm:w-[calc(100%_-_2.5rem)]">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-7 lg:min-h-24 lg:px-9">
          <Link href="/#explore" className="group flex shrink-0 items-center gap-3 sm:gap-5" aria-label="3DSFERA home">
            <BrandLogo size="lg" priority imageClassName="transition duration-500 group-hover:drop-shadow-[0_0_22px_rgba(255,139,45,0.5)]" />
            <span className="hidden text-sm font-medium tracking-[0.42em] text-white sm:block lg:text-xl">3DSFERA</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-full px-4 py-2 text-base font-medium text-white/80 transition hover:bg-white/[0.06] hover:text-white xl:px-6"
              >
                {t[route.key]}
              </Link>
            ))}
          </nav>

          <Link
            href="/pre-register"
            className="marketing-cta-glow inline-flex min-h-12 shrink-0 items-center justify-center rounded-[14px] border border-orange-100 bg-[linear-gradient(135deg,#ff4d00,#ff861c)] px-4 text-[10px] font-bold text-white shadow-[0_0_30px_rgba(255,94,20,0.5)] transition hover:-translate-y-0.5 hover:brightness-110 sm:px-6 sm:text-xs lg:min-h-14 lg:px-9 lg:text-base"
          >
            {t.earlyAccess}
          </Link>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/[0.07] px-3 py-2 lg:hidden" aria-label="Mobile navigation">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="shrink-0 rounded-full px-3 py-2 text-[10px] font-bold text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            >
              {t[route.key]}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
