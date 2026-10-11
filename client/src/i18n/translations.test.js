import { describe, expect, it } from 'vitest';
import { translate, translations } from './translations';

describe('translate', () => {
  it('returns English by default', () => {
    expect(translate('en', 'nav.browse')).toBe('Browse');
  });

  it('returns the chosen language', () => {
    expect(translate('es', 'nav.browse')).toBe('Explorar');
  });

  it('falls back to English and then the key', () => {
    // An unknown language falls back to English.
    expect(translate('fr', 'nav.about')).toBe('About');
    // An unknown key returns the key itself.
    expect(translate('en', 'missing.key')).toBe('missing.key');
  });

  it('interpolates placeholders', () => {
    expect(translate('en', 'footer.rights', { year: 2030 })).toContain('2030');
  });

  it('keeps unmatched placeholders', () => {
    expect(translate('en', 'footer.rights', {})).toContain('{year}');
  });

  it('has the same keys in every language', () => {
    const enKeys = Object.keys(translations.en).sort();
    for (const [code, dict] of Object.entries(translations)) {
      expect(Object.keys(dict).sort(), `${code} keys`).toEqual(enKeys);
    }
  });
});
