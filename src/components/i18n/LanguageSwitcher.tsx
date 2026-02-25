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
          <div className="rounded-2xl border border-white/15 bg-black/85 p-1 backdrop-blur-xl shadow-[0_14px_28px_rgba(0,0,0,0.4)]">
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
          className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl transition hover:bg-black/90"
          aria-label="Open language menu"
        >
          <Globe2 size={14} />
          {activeLabel}
        </button>
      </div>
    </div>
  );
}
