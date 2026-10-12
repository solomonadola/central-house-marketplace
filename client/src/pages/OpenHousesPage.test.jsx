import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import OpenHousesPage from './OpenHousesPage';
import { renderWithProviders } from '../test/utils';

const card = (id, name, viewer = null) => ({
  _id: id,
  startsAt: new Date(2030, 2, 14, 10).toISOString(),
  endsAt: new Date(2030, 2, 14, 12).toISOString(),
  capacity: 0,
  rsvpCount: 2,
  isFull: false,
  viewer,
  listing: { _id: `l-${id}`, name, address: 'Noe Street, San Francisco', imageUrls: [] },
});

describe('Open houses page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists upcoming open houses and the user’s RSVPs', async () => {
    const fetchMock = vi.fn(async (url) =>
      new Response(
        JSON.stringify(
          url === '/api/open-houses/mine'
            ? [card('a', 'Loft I Am Visiting', { isOwner: false, rsvped: true })]
            : [card('b', 'Garden Flat Open Day'), card('a', 'Loft I Am Visiting', { isOwner: false, rsvped: true })]
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<OpenHousesPage />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Garden Flat Open Day')).toBeInTheDocument();
    expect(screen.getAllByText('Loft I Am Visiting')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Garden Flat Open Day/ })).toHaveAttribute('href', '/listing/l-b');
    expect(fetchMock).toHaveBeenCalledWith('/api/open-houses/upcoming?limit=30', undefined);
  });

  it('skips the RSVP section for visitors and shows an empty state', async () => {
    const fetchMock = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<OpenHousesPage />);

    expect(await screen.findByText(/No open houses are scheduled/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "You're going to" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/open-houses/mine', undefined);
  });
});
