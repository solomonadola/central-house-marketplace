import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminHiddenListings from './AdminHiddenListings';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('AdminHiddenListings', () => {
  let fetchMock;
  let listings;

  beforeEach(() => {
    listings = [
      { _id: 'l1', name: 'Fake Villa Listing', hiddenReason: 'Stock photos', hiddenBy: 'moderation', ownerUsername: 'spammer' },
      { _id: 'l2', name: 'Suspended Owner Flat', hiddenReason: 'Owner account suspended', hiddenBy: 'suspension', ownerUsername: 'bad_actor' },
    ];
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method ? { ok: true } : listings));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists hidden listings with the reason and owner', async () => {
    renderWithProviders(<AdminHiddenListings />);

    expect(await screen.findByText('Fake Villa Listing')).toHaveAttribute('href', '/listing/l1');
    expect(screen.getByText('Stock photos · by spammer')).toBeInTheDocument();
  });

  it('un-hides a moderated listing', async () => {
    renderWithProviders(<AdminHiddenListings />);

    listings = [listings[1]];
    await userEvent.click(await screen.findByRole('button', { name: 'Unhide' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/listings/l1/unhide', { method: 'POST' });
    expect(await screen.findByText('Suspended Owner Flat')).toBeInTheDocument();
    expect(screen.queryByText('Fake Villa Listing')).not.toBeInTheDocument();
  });

  it('points to reinstating the owner for suspension-hidden listings', async () => {
    renderWithProviders(<AdminHiddenListings />);

    expect(await screen.findByText(/reinstating them restores it/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Unhide' })).toHaveLength(1);
  });

  it('shows an empty state', async () => {
    listings = [];
    renderWithProviders(<AdminHiddenListings />);
    expect(await screen.findByText('No hidden listings.')).toBeInTheDocument();
  });
});
