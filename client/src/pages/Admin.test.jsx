import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admin from './Admin';
import { renderWithProviders } from '../test/utils';

const stats = {
  users: { total: 1, newThisWeek: 0, suspended: 0 },
  listings: { total: 0, newThisWeek: 0, hidden: 0 },
  reports: { open: 0 },
  reviews: { total: 0 },
  messages: { conversations: 0, total: 0 },
};

describe('Admin page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => new Response(JSON.stringify(url.includes('stats') ? stats : []))));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('opens on the overview', async () => {
    renderWithProviders(<Admin />, { route: '/admin', currentUser: { _id: 'a', role: 'admin' } });

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Open reports')).toBeInTheDocument();
  });

  it('opens the tab named in the URL', async () => {
    renderWithProviders(<Admin />, { route: '/admin?tab=users', currentUser: { _id: 'a', role: 'admin' } });

    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('Search users')).toBeInTheDocument();
  });

  it('switches tabs', async () => {
    renderWithProviders(<Admin />, { route: '/admin', currentUser: { _id: 'a', role: 'admin' } });

    await userEvent.click(screen.getByRole('tab', { name: 'Reports' }));

    expect(await screen.findByText('No open reports. All caught up!')).toBeInTheDocument();
  });
});
