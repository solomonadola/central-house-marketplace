import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentlyViewed from './RecentlyViewed';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('RecentlyViewed page', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => jsonResponse([makeListing({ _id: 'l1', name: 'Viewed Loft Apartment' })]));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows an empty state with no history', async () => {
    renderWithProviders(<RecentlyViewed />);

    expect(await screen.findByText(/haven't viewed any homes/)).toBeInTheDocument();
  });

  it('loads the recently viewed listings', async () => {
    localStorage.setItem('recentlyViewed', JSON.stringify(['l1']));
    renderWithProviders(<RecentlyViewed />);

    expect(await screen.findByText('Viewed Loft Apartment')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/listing/by-ids?ids=l1');
  });

  it('clears the history', async () => {
    localStorage.setItem('recentlyViewed', JSON.stringify(['l1']));
    renderWithProviders(<RecentlyViewed />);
    await screen.findByText('Viewed Loft Apartment');

    await userEvent.click(screen.getByRole('button', { name: /Clear history/ }));

    expect(await screen.findByText(/haven't viewed any homes/)).toBeInTheDocument();
    expect(localStorage.getItem('recentlyViewed')).toBeNull();
  });
});
