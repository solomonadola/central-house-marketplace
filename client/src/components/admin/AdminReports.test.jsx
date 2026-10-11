import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminReports from './AdminReports';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const report = {
  _id: 'r1',
  reason: 'scam',
  details: 'Asked for a deposit by gift card',
  status: 'open',
  createdAt: new Date().toISOString(),
  reporter: { username: 'alice' },
  listing: { _id: 'l1', name: 'Suspicious Listing Here', hidden: false },
  openReportsForListing: 3,
};

describe('AdminReports', () => {
  let fetchMock;
  let reports;

  beforeEach(() => {
    reports = [report];
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method) return jsonResponse({ ok: true });
      return jsonResponse(reports);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists open reports with their details', async () => {
    renderWithProviders(<AdminReports />);

    expect(await screen.findByText('Suspicious Listing Here')).toHaveAttribute('href', '/listing/l1');
    expect(screen.getByText('Scam')).toBeInTheDocument();
    expect(screen.getByText('Asked for a deposit by gift card')).toBeInTheDocument();
    expect(screen.getByText('3 open reports')).toBeInTheDocument();
    expect(screen.getByText(/Reported by alice/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?status=open', undefined);
  });

  it('hides the listing with a reason, then reloads', async () => {
    renderWithProviders(<AdminReports />);

    await userEvent.click(await screen.findByRole('button', { name: 'Hide listing' }));
    await userEvent.type(screen.getByLabelText('Reason shown to the owner'), 'Fake listing');
    reports = [];
    await userEvent.click(screen.getByRole('button', { name: 'Hide listing' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/listings/l1/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Fake listing' }),
    });
    expect(await screen.findByText('No open reports. All caught up!')).toBeInTheDocument();
  });

  it('dismisses a report', async () => {
    renderWithProviders(<AdminReports />);

    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports/r1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
  });

  it('switches between statuses', async () => {
    renderWithProviders(<AdminReports />);
    await screen.findByText('Suspicious Listing Here');

    reports = [{ ...report, status: 'resolved' }];
    await userEvent.selectOptions(screen.getByRole('combobox'), 'resolved');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?status=resolved', undefined));
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('shows action errors', async () => {
    fetchMock.mockImplementation(async (url, options) =>
      options?.method
        ? jsonResponse({ success: false, message: 'This user already has an open report for this listing.' }, 409)
        : jsonResponse([{ ...report, status: 'dismissed' }])
    );
    renderWithProviders(<AdminReports />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reopen' }));

    expect(await screen.findByText(/already has an open report/)).toBeInTheDocument();
  });
});
