import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './Home';
import { makeListing, renderWithProviders } from '../test/utils';

const ShowLocation = () => <p data-testid='location'>{useLocation().pathname + useLocation().search}</p>;

describe('Home page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) => {
      const listings = url.includes('type=sale') ? [] : [makeListing({ _id: url, name: `Listing for ${url.split('?')[1]}` })];
      return new Response(JSON.stringify(listings));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const renderHome = () =>
    renderWithProviders(
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/search' element={<ShowLocation />} />
      </Routes>
    );

  it('loads each section and hides empty ones', async () => {
    renderHome();

    expect(await screen.findByRole('heading', { name: 'Special offers' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Homes for rent' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Homes for sale' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/listing/get?offer=true&limit=4', undefined);
  });

  it('searches from the hero', async () => {
    renderHome();

    await userEvent.selectOptions(screen.getByLabelText('Rent or buy'), 'rent');
    await userEvent.type(screen.getByLabelText('What are you looking for?'), ' loft ');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/search?searchTerm=loft&type=rent');
  });
});
