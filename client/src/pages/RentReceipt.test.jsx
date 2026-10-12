import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import RentReceipt from './RentReceipt';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const lease = {
  _id: 'lease1',
  currency: 'USD',
  listing: { _id: 'listing1', name: 'Canal View Flat', address: '9 Canal Street' },
  owner: { username: 'landlord_lee' },
  tenant: { username: 'tenant_tia' },
};

const paidOnline = {
  _id: 'c08',
  period: '2026-08',
  amount: 1500,
  dueDate: '2026-08-05T00:00:00.000Z',
  status: 'paid',
  method: 'online',
  reference: 'RENT-ABC123',
  paidAt: '2026-08-03T10:00:00.000Z',
  note: '',
};
const paidCash = { ...paidOnline, _id: 'c09', period: '2026-09', method: 'cash', reference: null, note: 'Handed over in person' };
const unpaid = { ...paidOnline, _id: 'c10', period: '2026-10', status: 'unpaid', method: null, paidAt: null };

const renderPage = (chargeId) =>
  renderWithProviders(
    <Routes>
      <Route path='/leases/:leaseId/receipts/:chargeId' element={<RentReceipt />} />
    </Routes>,
    { route: `/leases/lease1/receipts/${chargeId}`, currentUser: { _id: 'me' } }
  );

describe('Rent receipt', () => {
  let reply;

  beforeEach(() => {
    reply = { lease, charges: [unpaid, paidCash, paidOnline], viewer: { role: 'tenant' } };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(reply)));
  });

  afterEach(() => vi.unstubAllGlobals());

  const value = (label) => within(screen.getByText(label).parentElement).getByRole('definition');

  it('shows the details of an online payment', async () => {
    renderPage('c08');

    expect(await screen.findByRole('heading', { name: 'Rent receipt' })).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(value('Rent for')).toHaveTextContent('August 2026');
    expect(value('Home')).toHaveTextContent('Canal View Flat, 9 Canal Street');
    expect(value('Tenant')).toHaveTextContent('tenant_tia');
    expect(value('Paid to')).toHaveTextContent('landlord_lee');
    expect(value('Paid on')).toHaveTextContent('Aug 3, 2026');
    expect(value('Method')).toHaveTextContent('Paid online');
    expect(value('Reference')).toHaveTextContent('RENT-ABC123');
    expect(screen.getByText(/Paid through Central House\. Receipt for charge c08\./)).toBeInTheDocument();
  });

  it('describes a payment the owner recorded', async () => {
    renderPage('c09');

    expect(await screen.findByText(/Recorded as received by landlord_lee\./)).toBeInTheDocument();
    expect(value('Method')).toHaveTextContent('Cash');
    expect(value('Note')).toHaveTextContent('Handed over in person');
    expect(screen.queryByText('Reference')).not.toBeInTheDocument();
  });

  it('prints the page', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage('c08');

    await userEvent.click(await screen.findByRole('button', { name: 'Print' }));

    expect(print).toHaveBeenCalled();
    print.mockRestore();
  });

  it.each([
    ['an unpaid month', 'c10'],
    ['an unknown charge', 'nope'],
  ])('has no receipt for %s', async (_, chargeId) => {
    renderPage(chargeId);

    expect(await screen.findByRole('heading', { name: 'Receipt not available' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to lease' })).toHaveAttribute('href', '/leases/lease1');
  });

  it('has no receipt when the lease cannot be loaded', async () => {
    reply = { success: false, message: 'Lease not found!' };
    renderPage('c08');

    expect(await screen.findByRole('heading', { name: 'Receipt not available' })).toBeInTheDocument();
  });
});
