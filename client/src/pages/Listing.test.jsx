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

  it('asks signed-out visitors to sign in to contact the owner', async () => {
    renderListing(null);

    expect(await screen.findByRole('link', { name: 'Sign in to contact' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('button', { name: 'Message the owner' })).not.toBeInTheDocument();
  });

  it('offers signed-in visitors messaging and viewings', async () => {
    renderListing({ _id: 'visitor', favorites: [] });

    expect(await screen.findByRole('button', { name: 'Message the owner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request a viewing/ })).toBeInTheDocument();
  });

  it('shows the owner an edit link', async () => {
    renderListing({ _id: 'owner1', favorites: [] });

    expect(await screen.findByRole('link', { name: /Edit listing/ })).toHaveAttribute('href', '/update-listing/listing1');
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

  it('tells the owner why their listing is hidden', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.startsWith('/api/reviews/')
        ? jsonResponse({ average: 0, count: 0, reviews: [], viewer: null })
        : jsonResponse(makeListing({ userRef: 'owner1', hidden: true, hiddenReason: 'Misleading photos' }))
    );
    renderListing({ _id: 'owner1', favorites: [] });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'This listing is hidden from the public: Misleading photos'
    );
  });

  it('shows an error for a missing listing', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: false, message: 'Listing not found!' }, 404));
    renderListing(null);

    expect(await screen.findByRole('heading', { name: 'Listing not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse other homes' })).toHaveAttribute('href', '/search');
  });

  it('shows similar homes', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith('/similar')) return jsonResponse([makeListing({ _id: 's1', name: 'Similar Garden Cottage' })]);
      if (url.startsWith('/api/reviews/')) return jsonResponse({ average: 0, count: 0, reviews: [], viewer: null });
      return jsonResponse(makeListing({ userRef: 'owner1' }));
    });
    renderListing(null);

    expect(await screen.findByRole('heading', { name: 'Similar homes' })).toBeInTheDocument();
    expect(screen.getByText('Similar Garden Cottage')).toBeInTheDocument();
  });
});
