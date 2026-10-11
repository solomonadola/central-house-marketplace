import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import Listing from './Listing';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderListing = (currentUser) =>
  renderWithProviders(
    <Routes>
      <Route path='/listing/:listingId' element={<Listing />} />
    </Routes>,
    { route: '/listing/listing1', currentUser }
  );

const viewCalls = (fetchMock) =>
  fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/listing/view/'));

describe('Listing page', () => {
  let fetchMock;

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn(async (url) => {
      if (url.startsWith('/api/listing/view/')) return jsonResponse({ views: 8 });
      if (url.startsWith('/api/reviews/')) return jsonResponse({ average: 0, count: 0, reviews: [], viewer: null });
      return jsonResponse(makeListing({ userRef: 'owner1', views: 7 }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the listing and records a view for visitors', async () => {
    renderListing(null);

    expect(await screen.findByText(/Bright Two-Bedroom Apartment/)).toBeInTheDocument();
    await waitFor(() => expect(viewCalls(fetchMock)).toHaveLength(1));
    expect(screen.queryByText(/^\d+ views?$/)).not.toBeInTheDocument();
  });

  it('does not record a view for the owner, and shows them the count', async () => {
    renderListing({ _id: 'owner1', favorites: [] });

    expect(await screen.findByText('7 views')).toBeInTheDocument();
    expect(viewCalls(fetchMock)).toHaveLength(0);
  });

  it('shows a map when the listing has a location', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.startsWith('/api/reviews/')
        ? jsonResponse({ average: 0, count: 0, reviews: [], viewer: null })
        : jsonResponse(makeListing({ location: { lat: 37.76, lng: -122.42 } }))
    );
    renderListing(null);

    expect(await screen.findByRole('heading', { name: 'Location' })).toBeInTheDocument();
  });

  it('has no map without a location', async () => {
    renderListing(null);

    await screen.findByText(/Bright Two-Bedroom Apartment/);
    expect(screen.queryByRole('heading', { name: 'Location' })).not.toBeInTheDocument();
  });

  it('shows an error for a missing listing', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: false, message: 'Listing not found!' }, 404));
    renderListing(null);

    expect(await screen.findByText('Something went wrong!')).toBeInTheDocument();
  });
});
