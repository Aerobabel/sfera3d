'use client';

import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AppLanguage } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "ZH" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hideSwitcher = pathname?.startsWith('/experience') ?? false;

  const activeLabel = useMemo(
    () => OPTIONS.find((option) => option.value === language)?.label ?? language.toUpperCase(),
    [language]
  );

  if (hideSwitcher) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-[220]"
      style={{
        right: "calc(env(safe-area-inset-right, 0px) + 12px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {isOpen && (
          <div className="sfera-glass rounded-2xl p-1">
            <div className="flex flex-col gap-1">
              {OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setLanguage(option.value);
                    setIsOpen(false);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition ${
                    language === option.value
                      ? "bg-[#66d9cb] text-[#04110f]"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
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
          onClick={() => setIsOpen((previous) => !previous)}
          className="sfera-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold tracking-wide text-white transition hover:border-cyan-100/30"
          aria-label="Open language menu"
        >
          <Globe2 size={14} />
          {activeLabel}
        </button>
      </div>
    </div>
  );
}
