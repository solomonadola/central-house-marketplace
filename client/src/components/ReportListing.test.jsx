import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportListing from './ReportListing';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('ReportListing', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({ _id: 'r1' }, 201));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const openForm = async () => {
    render(<ReportListing listingId='l1' />);
    await userEvent.click(screen.getByRole('button', { name: /Report listing/ }));
  };

  it('sends a report with the chosen reason', async () => {
    await openForm();

    await userEvent.click(screen.getByLabelText('Looks like a scam'));
    await userEvent.type(screen.getByLabelText('Report details'), 'Wants a wire transfer');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText(/Our team will review this listing/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'l1', reason: 'scam', details: 'Wants a wire transfer' }),
    });
  });

  it('requires a reason', async () => {
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(screen.getByText('Please choose a reason.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a duplicate report as already received', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, statusCode: 409, message: 'Already reported' }, 409));
    await openForm();

    await userEvent.click(screen.getByLabelText('No longer available'));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText(/Our team will review this listing/)).toBeInTheDocument();
  });

  it('shows other errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, statusCode: 400, message: "You can't report your own listing!" }, 400));
    await openForm();

    await userEvent.click(screen.getByLabelText('Something else'));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText("You can't report your own listing!")).toBeInTheDocument();
  });

  it('can be cancelled', async () => {
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /Report listing/ })).toBeInTheDocument();
  });
});
