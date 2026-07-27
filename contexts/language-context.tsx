'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type TwigaLanguage = 'en' | 'sw';

type LanguageContextValue = {
  language: TwigaLanguage;
  setLanguage: (language: TwigaLanguage) => void;
};

const STORAGE_KEY = 'twiga-language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<TwigaLanguage>('en');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
      if (savedLanguage === 'en' || savedLanguage === 'sw') {
        setLanguageState(savedLanguage);
        document.documentElement.lang = savedLanguage;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setLanguage = useCallback((nextLanguage: TwigaLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return context;
}
