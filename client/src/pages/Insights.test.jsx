import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Insights from './Insights';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const insights = {
  total: 12,
  newThisWeek: 3,
  forRent: 8,
  forSale: 4,
  prices: {
    rent: { average: 1500, min: 900, max: 3000, averageBedrooms: 2.5, averageBathrooms: 1.4, furnishedShare: 0.5 },
    sale: { average: 300000, min: 120000, max: 900000, averageBedrooms: 3, averageBathrooms: 2, furnishedShare: 0 },
  },
  byPropertyType: [
    { propertyType: 'house', count: 7, averagePrice: 250000 },
    { propertyType: 'apartment', count: 5, averagePrice: 1200 },
  ],
};

describe('Insights page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the totals and average prices', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(insights)));
    renderWithProviders(<Insights />);

    expect(await screen.findByText('Homes listed')).toBeInTheDocument();
    expect(screen.getByText('Homes listed').nextSibling).toHaveTextContent('12');
    expect(screen.getByText('New this week').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText('$300,000')).toBeInTheDocument();
  });

  it('breaks listings down by property type', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(insights)));
    renderWithProviders(<Insights />);

    expect(await screen.findByText('House')).toBeInTheDocument();
    expect(screen.getByText(/7 homes/)).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false, message: 'Boom' }, 500)));
    renderWithProviders(<Insights />);

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });
});
