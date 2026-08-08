import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('vortex-language') || 'zh';
  });

  const t = (key, params = {}) => {
    const trans = translations[language] || translations['zh'];
    let text = trans[key];
    if (text === undefined) {
      // Fallback to zh if not found in en
      text = translations['zh'][key];
    }
    if (text === undefined) {
      return key;
    }
    
    // Replace parameters
    Object.keys(params).forEach((k) => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('vortex-language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
