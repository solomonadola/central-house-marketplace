import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from './I18nContext';
import { useTranslation } from './context';

function Probe() {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div>
      <span data-testid='language'>{language}</span>
      <span data-testid='label'>{t('nav.browse')}</span>
      <button type='button' onClick={() => setLanguage('es')}>
        switch
      </button>
    </div>
  );
}

describe('useTranslation', () => {
  it('falls back to English without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('label')).toHaveTextContent('Browse');
  });

  it('uses the provider language and updates on change', async () => {
    localStorage.clear();
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(screen.getByTestId('language')).toHaveTextContent('es');
    expect(screen.getByTestId('label')).toHaveTextContent('Explorar');
    expect(localStorage.getItem('language')).toBe('es');
  });
});
