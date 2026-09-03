'use client';

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy = {
  en: { explore: "Explore", play: "Play", discover: "Discover", about: "About", contact: "Contact", rights: "All rights reserved." },
  ru: { explore: "Исследовать", play: "Играть", discover: "Открывать", about: "О нас", contact: "Контакты", rights: "Все права защищены." },
  zh: { explore: "探索", play: "游玩", discover: "发现", about: "关于", contact: "联系", rights: "版权所有。" },
} as const;

const links = [
  ["/#about", "about"],
  ["/#explore", "explore"],
  ["/#play", "play"],
  ["/#discover", "discover"],
] as const;

export default function MarketingFooter() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <footer className="relative z-10 border-t border-sky-200/20 bg-[#02050b]/68 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1460px] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <Link href="/#explore" className="flex items-center gap-4" aria-label="3DSFERA home">
          <BrandLogo size="md" />
          <span className="text-sm font-medium tracking-[0.38em] text-white/90">3DSFERA</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/45" aria-label="Footer navigation">
          {links.map(([href, key]) => (
            <span key={href} className="flex items-center gap-4"><Link href={href} className="transition hover:text-white">{t[key]}</Link><span className="text-white/20">|</span></span>
          ))}
          <Link href="/#contact" className="transition hover:text-white">Partners</Link><span className="text-white/20">|</span>
          <Link href="/#contact" className="transition hover:text-white">Contact</Link><span className="text-white/20">|</span>
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link><span className="text-white/20">|</span>
          <Link href="/terms" className="transition hover:text-white">Terms</Link>
        </nav>

        <p className="text-xs text-white/35">© 2026 3DSFERA. {t.rights}</p>
      </div>
    </footer>
  );
}
