import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import Search from './Search';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, total) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...(total !== undefined && { 'X-Total-Count': String(total) }) },
  });

const listingsPage = (start, count) =>
  Array.from({ length: count }, (_, i) => makeListing({ _id: `l${start + i}`, name: `Test Listing Number ${start + i}` }));

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
    expect(screen.getByLabelText('Bedrooms')).toHaveValue('3');
    expect(screen.getByLabelText('Bathrooms')).toHaveValue('2');
    expect(screen.getByDisplayValue('Price low to high')).toBeInTheDocument();
    await screen.findByText('Bright Two-Bedroom Apartment');
  });

  it('puts the chosen filters in the URL on submit', async () => {
    renderSearch();
    await screen.findByText('Bright Two-Bedroom Apartment');

    await userEvent.type(screen.getByLabelText('Minimum price'), '800');
    await userEvent.type(screen.getByLabelText('Maximum price'), '2500');
    await userEvent.selectOptions(screen.getByLabelText('Bedrooms'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('location').textContent);
      expect(params.get('minPrice')).toBe('800');
      expect(params.get('maxPrice')).toBe('2500');
      expect(params.get('minBedrooms')).toBe('2');
      expect(params.has('minBathrooms')).toBe(false);
    });
  });

  it('shows the result count and loads more until all are shown', async () => {
    fetchMock
      .mockImplementationOnce(async () => jsonResponse(listingsPage(0, 9), 12))
      .mockImplementationOnce(async () => jsonResponse(listingsPage(9, 3), 12));
    renderSearch('/search?type=rent');

    expect(await screen.findByText('Showing 9 of 12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Showing 12 of 12')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/listing/get?type=rent&startIndex=9', undefined);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('does not offer "Show more" when exactly one page matches', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(listingsPage(0, 9), 9));
    renderSearch();

    expect(await screen.findByText('Showing 9 of 9')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderSearch();

    expect(await screen.findByText(/Could not load listings/)).toBeInTheDocument();
    expect(screen.queryByText('No listing found!')).not.toBeInTheDocument();
  });

  it('switches to a map view and remembers the choice', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse([
        makeListing({ _id: 'a', regularPrice: 1500, location: { lat: 37.76, lng: -122.42 } }),
        makeListing({ _id: 'b', name: 'Listing Without Location' }),
      ])
    );
    const { container, unmount } = renderSearch();
    await screen.findByText('Listing Without Location');

    await userEvent.click(screen.getByRole('button', { name: 'Map' }));

    expect(container.querySelectorAll('.listing-price-marker')).toHaveLength(1);
    expect(screen.queryByText('Listing Without Location')).not.toBeInTheDocument();
    expect(screen.getByText(/1 listing\(s\) have no location/)).toBeInTheDocument();

    unmount();
    renderSearch();
    expect(await screen.findByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a message when nothing matches', async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]));
    renderSearch('/search?minPrice=99999999');

    expect(await screen.findByText('No listing found!')).toBeInTheDocument();
  });

  it('fills the property type and amenities filters from the URL', async () => {
    renderSearch('/search?propertyType=house&amenities=garden,wifi');

    expect(screen.getByLabelText('Property type')).toHaveValue('house');
    expect(screen.getByRole('checkbox', { name: 'Garden' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pool' })).not.toBeChecked();
    await screen.findByText('Bright Two-Bedroom Apartment');
  });

  it('adds amenities and property type to the URL on submit', async () => {
    renderSearch();
    await screen.findByText('Bright Two-Bedroom Apartment');

    await userEvent.selectOptions(screen.getByLabelText('Property type'), 'studio');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Garden' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('location').textContent);
      expect(params.get('propertyType')).toBe('studio');
      expect(params.get('amenities')).toBe('garden');
    });
  });
});
