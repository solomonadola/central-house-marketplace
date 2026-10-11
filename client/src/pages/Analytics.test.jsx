import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import Analytics from './Analytics';
import { renderWithProviders } from '../test/utils';

const analytics = {
  totals: { listings: 2, views: 1268, viewsLast30Days: 1019, saves: 3, enquiries: 2, viewingRequests: 1 },
  viewsByDay: Array.from({ length: 30 }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, '0')}`, views: i })),
  listings: [
    { _id: 'l1', name: 'Popular Listing Here', views: 900, viewsLast30Days: 700, saves: 2, enquiries: 2, viewingRequests: 1, ratingAverage: 4.5, ratingCount: 2, hidden: false },
    { _id: 'l2', name: 'Quiet Listing Here', views: 368, viewsLast30Days: 319, saves: 1, enquiries: 0, viewingRequests: 0, ratingAverage: 0, ratingCount: 0, hidden: true },
  ],
};

const stub = (body) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));

describe('Analytics page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows totals, the chart and per-listing numbers', async () => {
    stub(analytics);
    renderWithProviders(<Analytics />);

    expect(await screen.findByText('1,019')).toBeInTheDocument();
    expect(screen.getByText('All-time views').nextSibling).toHaveTextContent('1,268');
    expect(screen.getByText('Views per day, last 30 days')).toBeInTheDocument();

    const row = screen.getByRole('link', { name: 'Popular Listing Here' }).closest('tr');
    expect(within(row).getByText('700')).toBeInTheDocument();
    expect(within(row).getByText('4.5 (2)')).toBeInTheDocument();
    const quiet = screen.getByRole('link', { name: 'Quiet Listing Here' }).closest('tr');
    expect(within(quiet).getByText('Hidden')).toBeInTheDocument();
    expect(within(quiet).getByText('—')).toBeInTheDocument();
  });

  it('invites users without listings to create one', async () => {
    stub({ ...analytics, totals: { ...analytics.totals, listings: 0 }, listings: [] });
    renderWithProviders(<Analytics />);

    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/create-listing');
  });
});
