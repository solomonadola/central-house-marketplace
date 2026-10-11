import { createContext, useContext } from 'react';
import { translate } from './translations';

// The default makes useTranslation safe to call without a provider (e.g. in
// a component test), rendering English.
export const I18nContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, vars) => translate('en', key, vars),
});

export const useTranslation = () => useContext(I18nContext);
