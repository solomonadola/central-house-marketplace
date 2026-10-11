import { useCallback, useMemo, useState } from 'react';
import { I18nContext } from './context';
import { translate } from './translations';

const STORAGE_KEY = 'language';

const readLanguage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
};

export function I18nProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(initialLanguage ?? readLanguage);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort.
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key, vars) => translate(language, key, vars) }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
