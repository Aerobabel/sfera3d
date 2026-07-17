'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  toHtmlLanguageTag,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_EVENT_NAME = "3dsfera-language-change";

const readStoredLanguage = (defaultLanguage: AppLanguage) => {
  if (typeof window === "undefined") return defaultLanguage;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isAppLanguage(stored) ? stored : defaultLanguage;
};

const subscribeToLanguage = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleLanguageChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_EVENT_NAME, handleLanguageChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_EVENT_NAME, handleLanguageChange);
  };
};

export function LanguageProvider({
  children,
  defaultLanguage = DEFAULT_LANGUAGE,
}: {
  children: ReactNode;
  defaultLanguage?: AppLanguage;
}) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    () => readStoredLanguage(defaultLanguage),
    () => defaultLanguage
  );

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      isAppLanguage(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE
    );
    window.dispatchEvent(new Event(LANGUAGE_EVENT_NAME));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = toHtmlLanguageTag(language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}
