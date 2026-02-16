
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: 'en' | 'he';
  dir: 'ltr' | 'rtl';
  t: (key: TranslationKey) => string;
  toggleLanguage: () => void;
  setLanguage: (lang: 'en' | 'he') => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'he'>(() => {
    const saved = localStorage.getItem('ft_language');
    return (saved === 'he' ? 'he' : 'en');
  });

  const dir = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('ft_language', language);
  }, [language, dir]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => prev === 'en' ? 'he' : 'en');
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'he') => {
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, dir, t, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
