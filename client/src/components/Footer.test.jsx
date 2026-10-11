import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';
import { I18nProvider } from '../i18n/I18nContext';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <Footer />
      </I18nProvider>
    </MemoryRouter>
  );

describe('Footer', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('renders the English copy by default', () => {
    renderFooter();

    expect(screen.getByText(/talk to owners directly/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Homes for rent' })).toHaveAttribute('href', '/search?type=rent');
  });

  it('switches language and remembers the choice', async () => {
    renderFooter();

    await userEvent.selectOptions(screen.getByLabelText('Language'), 'es');

    expect(screen.getByText(/habla con los propietarios/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Casas en alquiler' })).toBeInTheDocument();
    expect(localStorage.getItem('language')).toBe('es');
  });
});
