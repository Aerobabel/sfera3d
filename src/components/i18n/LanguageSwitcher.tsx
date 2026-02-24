'use client';

import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AppLanguage } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "ru", label: "RU" },
  { value: "zh", label: "ZH" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hideMobileSwitcher = pathname?.startsWith('/experience') ?? false;

  const activeLabel = useMemo(
    () => OPTIONS.find((option) => option.value === language)?.label ?? language.toUpperCase(),
    [language]
  );

  return (
    <>
      <div className="fixed left-1/2 top-3 z-[320] hidden -translate-x-1/2 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-xl md:block">
        <div className="flex items-center gap-1">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setLanguage(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                language === option.value
                  ? 'bg-[#66d9cb] text-[#04110f]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              aria-label={`Switch language to ${option.label}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hideMobileSwitcher && (
        <div className="fixed bottom-4 left-4 z-[320] md:hidden">
          {isMobileOpen && (
            <div className="mb-2 rounded-2xl border border-white/15 bg-black/80 p-1 backdrop-blur-xl">
              <div className="flex flex-col gap-1">
                {OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setLanguage(option.value);
                      setIsMobileOpen(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition ${
                      language === option.value
                        ? 'bg-[#66d9cb] text-[#04110f]'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-label={`Switch language to ${option.label}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsMobileOpen((previous) => !previous)}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl transition hover:bg-black/90"
            aria-label="Open language menu"
          >
            <Globe2 size={14} />
            {activeLabel}
          </button>
        </div>
      )}
    </>
  );
}
