'use client';

import { AppLanguage } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "ru", label: "RU" },
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
              language === option.value
                ? "bg-[#66d9cb] text-[#04110f]"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
