import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import Search from './Search';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const ShowLocation = () => <p data-testid='location'>{useLocation().search}</p>;

const renderSearch = (route = '/search') =>
  renderWithProviders(
    <Routes>
      <Route
        path='/search'
        element={
          <>
            <Search />
            <ShowLocation />
          </>
        }
      />
    </Routes>,
    { route }
  );

describe('Search page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async () => jsonResponse([makeListing()]));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches listings using the URL query', async () => {
    renderSearch('/search?type=rent&minPrice=500&minBedrooms=2');

    expect(await screen.findByText('Bright Two-Bedroom Apartment')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/listing/get?type=rent&minPrice=500&minBedrooms=2', undefined);
  });

  it('fills the filters from the URL', async () => {
    renderSearch('/search?minPrice=500&maxPrice=2000&minBedrooms=3&minBathrooms=2&sort=regularPrice&order=asc');

    expect(screen.getByLabelText('Minimum price')).toHaveValue(500);
    expect(screen.getByLabelText('Maximum price')).toHaveValue(2000);
    expect(screen.getByLabelText('Beds:')).toHaveValue('3');
    expect(screen.getByLabelText('Baths:')).toHaveValue('2');
    expect(screen.getByDisplayValue('Price low to high')).toBeInTheDocument();
    await screen.findByText('Bright Two-Bedroom Apartment');
  });

  it('puts the chosen filters in the URL on submit', async () => {
    renderSearch();
    await screen.findByText('Bright Two-Bedroom Apartment');

    await userEvent.type(screen.getByLabelText('Minimum price'), '800');
    await userEvent.type(screen.getByLabelText('Maximum price'), '2500');
    await userEvent.selectOptions(screen.getByLabelText('Beds:'), '2');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('location').textContent);
      expect(params.get('minPrice')).toBe('800');
      expect(params.get('maxPrice')).toBe('2500');
      expect(params.get('minBedrooms')).toBe('2');
      expect(params.has('minBathrooms')).toBe(false);
    });
  });

  it('shows a message when nothing matches', async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]));
    renderSearch('/search?minPrice=99999999');

    expect(await screen.findByText('No listing found!')).toBeInTheDocument();
  });
});
