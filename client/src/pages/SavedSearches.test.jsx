import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedSearches from './SavedSearches';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const savedSearch = (overrides = {}) => ({
  _id: 's1',
  name: 'Cheap rentals',
  alertsEnabled: true,
  filters: { type: 'rent', maxPrice: 1500, minBedrooms: 2, parking: true },
  ...overrides,
});

describe('SavedSearches page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET' && url === '/api/saved-searches') return jsonResponse([savedSearch()]);
      if (method === 'PATCH') return jsonResponse(savedSearch({ alertsEnabled: false }));
      if (method === 'DELETE') return jsonResponse('Saved search deleted!');
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists saved searches with a summary and a results link', async () => {
    renderWithProviders(<SavedSearches />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Cheap rentals')).toBeInTheDocument();
    expect(screen.getByText('For rent · under 1500 · 2+ beds · Parking')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Run saved search/ });
    expect(link.getAttribute('href')).toContain('/search?');
    expect(link.getAttribute('href')).toContain('type=rent');
  });

  it('toggles alerts off', async () => {
    renderWithProviders(<SavedSearches />, { currentUser: { _id: 'me' } });
    await screen.findByText('Cheap rentals');

    await userEvent.click(screen.getByRole('button', { name: /Alerts on/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/saved-searches/s1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('deletes a saved search', async () => {
    renderWithProviders(<SavedSearches />, { currentUser: { _id: 'me' } });
    await screen.findByText('Cheap rentals');

    await userEvent.click(screen.getByRole('button', { name: /Delete saved search/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/saved-searches/s1', { method: 'DELETE' });
    });
  });

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    renderWithProviders(<SavedSearches />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText(/don't have any saved searches/)).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithProviders(<SavedSearches />, { currentUser: { _id: 'me' } });

    const list = await screen.findByText('Failed to fetch');
    expect(list).toBeInTheDocument();
  });
});
