import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Saved from './Saved';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Saved page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists saved listings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          makeListing({ _id: 'a', name: 'Saved Apartment One' }),
          makeListing({ _id: 'b', name: 'Saved Cottage Two' }),
        ])
      )
    );
    renderWithProviders(<Saved />, { currentUser: { _id: 'u1', favorites: ['a', 'b'] } });

    expect(await screen.findByText('Saved Apartment One')).toBeInTheDocument();
    expect(screen.getByText('Saved Cottage Two')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])));
    renderWithProviders(<Saved />, { currentUser: { _id: 'u1', favorites: [] } });

    expect(await screen.findByText(/haven't saved any listings/)).toBeInTheDocument();
  });

  it('removes a listing from the page when it is unsaved', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, [makeListing({ _id: 'a', name: 'Saved Apartment One' })]))
        .mockResolvedValueOnce(jsonResponse(200, { favorites: [] }))
    );
    renderWithProviders(<Saved />, { currentUser: { _id: 'u1', favorites: ['a'] } });

    await userEvent.click(await screen.findByRole('button', { name: 'Remove from saved' }));

    expect(screen.queryByText('Saved Apartment One')).not.toBeInTheDocument();
    expect(screen.getByText(/haven't saved any listings/)).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderWithProviders(<Saved />, { currentUser: { _id: 'u1', favorites: [] } });

    expect(await screen.findByText('Could not load your saved listings.')).toBeInTheDocument();
  });
});
