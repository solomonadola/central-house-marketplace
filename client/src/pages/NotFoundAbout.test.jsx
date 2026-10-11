import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import NotFound from './NotFound';
import About from './About';
import { renderWithProviders } from '../test/utils';

describe('NotFound page', () => {
  it('says which page is missing and offers a way back', () => {
    renderWithProviders(<NotFound />, { route: '/no-such-page' });

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('/no-such-page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go home/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Browse homes/ })).toHaveAttribute('href', '/search');
  });
});

describe('About page', () => {
  it('describes the marketplace for each audience and its safety features', () => {
    renderWithProviders(<About />);

    expect(screen.getByRole('heading', { name: 'About Central House Marketplace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Renters and buyers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Owners and landlords' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trust and safety' })).toBeInTheDocument();
    expect(screen.getByText(/There are no\s+agents in the middle/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the help & FAQ' })).toHaveAttribute('href', '/help');
  });
});
