import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import AdminOverview from './AdminOverview';
import { renderWithProviders } from '../../test/utils';

const stats = {
  users: { total: 42, newThisWeek: 5, suspended: 1 },
  listings: { total: 20, newThisWeek: 3, hidden: 2 },
  reports: { open: 4 },
  reviews: { total: 9 },
  messages: { conversations: 7, total: 31 },
};

describe('AdminOverview', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the site statistics', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(stats))));
    renderWithProviders(<AdminOverview />);

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('5 new this week · 1 suspended')).toBeInTheDocument();
    expect(screen.getByText('3 new this week · 2 hidden')).toBeInTheDocument();
    expect(screen.getByText('Open reports').nextSibling).toHaveTextContent('4');
    expect(screen.getByText('31 messages')).toBeInTheDocument();
  });

  it('shows errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, message: 'Admins only!' }), { status: 403 })));
    renderWithProviders(<AdminOverview />);

    expect(await screen.findByText('Admins only!')).toBeInTheDocument();
  });
});
