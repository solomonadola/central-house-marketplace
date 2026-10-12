import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LeaseDetail from './LeaseDetail';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const lease = {
  _id: 'lease1',
  status: 'active',
  monthlyRent: 1500,
  currency: 'USD',
  dueDay: 5,
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: null,
  notes: 'Rent goes to the account in your welcome email.',
  listing: { _id: 'listing1', name: 'Canal View Flat', address: '9 Canal Street' },
  owner: { username: 'landlord_lee' },
  tenant: { username: 'tenant_tia' },
};

const charges = [
  { _id: 'c10', period: '2026-10', amount: 1500, dueDate: '2026-10-05T00:00:00.000Z', status: 'unpaid', state: 'overdue', daysOverdue: 7, note: '' },
  { _id: 'c09', period: '2026-09', amount: 1500, dueDate: '2026-09-05T00:00:00.000Z', status: 'waived', state: 'waived', daysOverdue: 0, note: 'Boiler was broken' },
  {
    _id: 'c08',
    period: '2026-08',
    amount: 1500,
    dueDate: '2026-08-05T00:00:00.000Z',
    status: 'paid',
    state: 'paid',
    daysOverdue: 0,
    method: 'online',
    reference: 'RENT-ABC123',
    paidAt: '2026-08-03T10:00:00.000Z',
    note: '',
  },
];

const summary = {
  charged: 4500,
  paid: 1500,
  waived: 1500,
  balance: 1500,
  overdueCount: 1,
  overdueAmount: 1500,
  nextDue: { period: '2026-10', amount: 1500, dueDate: '2026-10-05T00:00:00.000Z', state: 'overdue' },
};

const view = (role, overrides = {}) => ({ lease, charges, summary, viewer: { role }, ...overrides });

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path='/leases/:leaseId' element={<LeaseDetail />} />
    </Routes>,
    { route: '/leases/lease1', currentUser: { _id: 'me' } }
  );

describe('Lease page', () => {
  let fetchMock;
  let current;
  let afterAction;

  beforeEach(() => {
    current = view('tenant');
    afterAction = null;
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse(afterAction ?? current);
      return jsonResponse(current);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the lease terms, totals and every month', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Canal View Flat' })).toBeInTheDocument();
    expect(screen.getByText('$1,500 / month')).toBeInTheDocument();
    expect(screen.getByText('On the 5th')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026 – ongoing')).toBeInTheDocument();
    expect(screen.getByText('landlord_lee')).toBeInTheDocument();
    expect(screen.getByText('Rent goes to the account in your welcome email.')).toBeInTheDocument();
    expect(screen.getByText('$1,500 · October 2026')).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Overdue')).toBeInTheDocument();
    expect(within(rows[0]).getByText('7 days late')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Boiler was broken')).toBeInTheDocument();
    expect(within(rows[2]).getByText(/Paid online · Aug 3, 2026 · RENT-ABC123/)).toBeInTheDocument();
  });

  it('lets the tenant pay an unpaid month', async () => {
    afterAction = view('tenant', { charges: [{ ...charges[0], status: 'paid', state: 'paid', daysOverdue: 0, method: 'online' }, ...charges.slice(1)] });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Pay $1,500' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/leases/lease1/charges/c10/pay',
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findAllByText('Paid')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Pay/ })).not.toBeInTheDocument();
  });

  it("doesn't give tenants owner controls", async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Pay $1,500' });

    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End lease' })).not.toBeInTheDocument();
  });

  it('lets the owner record a payment made outside the app', async () => {
    current = view('owner');
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    const form = screen.getByRole('form', { name: 'Record payment for October 2026' });
    await userEvent.selectOptions(within(form).getByLabelText('Payment method'), 'cash');
    await userEvent.type(within(form).getByLabelText('Note'), 'Handed over in person');
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/leases/lease1/charges/c10/record');
    expect(JSON.parse(options.body)).toEqual({ method: 'cash', note: 'Handed over in person' });
    expect(screen.getByText('tenant_tia')).toBeInTheDocument();
  });

  it('lets the owner waive a month', async () => {
    current = view('owner');
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Waive' }));
    await userEvent.click(screen.getByRole('button', { name: 'Waive month' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/leases/lease1/charges/c10/waive');
    expect(JSON.parse(options.body)).toEqual({ note: '' });
  });

  it('lets the owner end the lease', async () => {
    current = view('owner');
    afterAction = view('owner', { lease: { ...lease, status: 'ended', endDate: '2026-10-31T00:00:00.000Z' } });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'End lease' }));
    const date = screen.getByLabelText('Last day of the lease');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-10-31');
    await userEvent.click(screen.getByRole('button', { name: 'End lease' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/leases/lease1/end');
    expect(JSON.parse(options.body)).toEqual({ endDate: '2026-10-31' });
    expect(await screen.findByText('Ended')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026 – Oct 31, 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
  });

  it('shows an error from a failed action', async () => {
    afterAction = { success: false, message: "This month's rent is already paid." };
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Pay $1,500' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("This month's rent is already paid.");
  });

  it('explains when nothing has been charged yet', async () => {
    current = view('tenant', { charges: [], summary: { ...summary, balance: 0, paid: 0, nextDue: null, overdueCount: 0 } });
    renderPage();

    expect(await screen.findByText('The first rent is charged in the month the lease starts.')).toBeInTheDocument();
    expect(screen.getByText('Nothing due')).toBeInTheDocument();
  });

  it('shows a not-found message', async () => {
    current = { success: false, message: 'Lease not found!' };
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Lease not found' })).toBeInTheDocument();
  });
});
