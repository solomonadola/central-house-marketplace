import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Analytics from './Analytics';
import { renderWithProviders } from '../test/utils';

const analytics = {
  totals: {
    listings: 2,
    views: 1268,
    viewsLast30Days: 1019,
    saves: 3,
    enquiries: 2,
    viewingRequests: 1,
    applications: 4,
    approvedApplications: 2,
    depositsPaid: 2,
    depositsPaidAmount: 1000,
    enquiryRate: 0.0016,
    approvalRate: 0.5,
  },
  viewsByDay: Array.from({ length: 30 }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, '0')}`, views: i })),
  listings: [
    { _id: 'l1', name: 'Popular Listing Here', views: 900, viewsLast30Days: 700, saves: 2, enquiries: 2, viewingRequests: 1, applications: 3, depositsPaid: 1, ratingAverage: 4.5, ratingCount: 2, hidden: false },
    { _id: 'l2', name: 'Quiet Listing Here', views: 368, viewsLast30Days: 319, saves: 1, enquiries: 0, viewingRequests: 0, applications: 0, depositsPaid: 0, ratingAverage: 0, ratingCount: 0, hidden: true },
  ],
};

const stub = (body) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));

describe('Analytics page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows totals, the chart and per-listing numbers', async () => {
    stub(analytics);
    renderWithProviders(<Analytics />);

    expect(await screen.findByText('1,019')).toBeInTheDocument();
    expect(screen.getByText('All-time views').nextSibling).toHaveTextContent('1,268');
    expect(screen.getByText('Views per day, last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Applications', { selector: 'p' }).nextSibling).toHaveTextContent('4');

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

  it('exports analytics to CSV', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/export')) {
        return new Response('Listing,Views\nA,1\n', {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="report.csv"' },
        });
      }
      return new Response(JSON.stringify(analytics));
    });
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithProviders(<Analytics />);
    await screen.findByText('1,019');
    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }));

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/user/analytics/export'))).toBe(true);
  });
});
