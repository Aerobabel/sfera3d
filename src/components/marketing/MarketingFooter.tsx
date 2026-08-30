'use client';

import Link from "next/link";
import { Mail } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy = {
  en: { questions: "Still have questions?", about: "About", partner: "Partner onboarding" },
  ru: { questions: "Остались вопросы?", about: "О нас", partner: "Онбординг партнёров" },
  zh: { questions: "还有疑问？", about: "关于", partner: "合作伙伴入驻" },
} as const;

export default function MarketingFooter() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#03050a]/90">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--sfera-marketing-orange)]">{t.questions}</p>
          <a href="mailto:help@3dsfera.com" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white">
            <Mail className="h-4 w-4 text-[var(--sfera-marketing-cyan)]" /> help@3dsfera.com
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
          <Link href="/" className="transition hover:text-white">3DSFERA</Link>
          <Link href="/about" className="transition hover:text-white">{t.about}</Link>
          <Link href="/onboarding" className="transition hover:text-white">{t.partner}</Link>
        </div>
      </div>
    </footer>
  );
}
