import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Compare from './Compare';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Compare page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      jsonResponse([
        makeListing({ _id: 'a', name: 'Alpha Apartment', bedrooms: 2 }),
        makeListing({ _id: 'b', name: 'Beta Cottage', bedrooms: 3 }),
      ])
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('prompts to pick homes when nothing is selected', () => {
    renderWithProviders(<Compare />, { compareIds: [] });
    expect(screen.getByRole('link', { name: 'Browse homes' })).toHaveAttribute('href', '/search');
  });

  it('shows the selected listings side by side with their details', async () => {
    renderWithProviders(<Compare />, { compareIds: ['a', 'b'] });

    expect(await screen.findByText('Alpha Apartment')).toBeInTheDocument();
    expect(screen.getByText('Beta Cottage')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Bedrooms' })).toBeInTheDocument();
    expect(screen.getByText('Bedrooms').closest('tr')).toHaveTextContent('2');
    expect(screen.getByText('Bedrooms').closest('tr')).toHaveTextContent('3');
  });

  it('requests the listings in the selected order', async () => {
    renderWithProviders(<Compare />, { compareIds: ['b', 'a'] });
    await screen.findByText('Alpha Apartment');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/listing/compare?ids=b,a');
  });

  it('removes a listing from the comparison', async () => {
    const { store } = renderWithProviders(<Compare />, { compareIds: ['a', 'b'] });
    await screen.findByText('Alpha Apartment');

    await userEvent.click(screen.getAllByRole('button', { name: /Remove/ })[0]);

    expect(store.getState().compare.ids).toEqual(['b']);
  });
});
