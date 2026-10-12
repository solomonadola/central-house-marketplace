import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import Rent from './Rent';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const summary = (overrides) => ({ charged: 0, paid: 0, waived: 0, balance: 0, overdueCount: 0, overdueAmount: 0, nextDue: null, ...overrides });

const leases = [
  {
    _id: 'l1',
    status: 'active',
    monthlyRent: 1500,
    currency: 'USD',
    dueDay: 1,
    startDate: '2026-08-01T00:00:00.000Z',
    listing: { name: 'Canal View Flat' },
    owner: { username: 'landlord_lee' },
    tenant: { username: 'tenant_tia' },
    summary: summary({ balance: 3000, overdueCount: 2 }),
  },
  {
    _id: 'l2',
    status: 'active',
    monthlyRent: 900,
    currency: 'USD',
    dueDay: 15,
    startDate: '2026-09-15T00:00:00.000Z',
    listing: { name: 'Studio Loft' },
    owner: { username: 'landlord_lee' },
    tenant: { username: 'tenant_tom' },
    summary: summary({ balance: 900 }),
  },
  {
    _id: 'l3',
    status: 'ended',
    monthlyRent: 700,
    currency: 'USD',
    dueDay: 3,
    startDate: '2025-01-01T00:00:00.000Z',
    listing: null,
    owner: { username: 'landlord_lee' },
    tenant: null,
    summary: summary(),
  },
];

const candidate = {
  applicationId: 'app1',
  listing: { _id: 'listing1', name: 'Garden Flat' },
  tenant: { username: 'new_tenant' },
  suggestedRent: 1250,
  moveInDate: '2026-11-01T00:00:00.000Z',
};

const Detail = () => <p>Lease page {useParams().leaseId}</p>;

const renderPage = (route = '/rent') =>
  renderWithProviders(
    <Routes>
      <Route path='/rent' element={<Rent />} />
      <Route path='/leases/:leaseId' element={<Detail />} />
    </Routes>,
    { route, currentUser: { _id: 'me' } }
  );

describe('Rent page', () => {
  let fetchMock;
  let created;

  beforeEach(() => {
    created = { lease: { _id: 'new-lease' } };
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse(created, created.success === false ? 400 : 201);
      if (url === '/api/leases/candidates') return jsonResponse([candidate]);
      return jsonResponse(leases);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lists the tenant's leases with their balance", async () => {
    renderPage();

    const flat = await screen.findByRole('link', { name: /Canal View Flat/ });
    expect(within(flat).getByText('$3,000 overdue')).toBeInTheDocument();
    expect(within(flat).getByText(/\$1,500 \/ month, due on the 1st/)).toBeInTheDocument();
    expect(within(flat).getByText(/Owner: landlord_lee/)).toBeInTheDocument();
    expect(flat).toHaveAttribute('href', '/leases/l1');
    expect(within(screen.getByRole('link', { name: /Studio Loft/ })).getByText('$900 due')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Listing removed/ })).getByText('Ended')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/leases', undefined);
    expect(fetchMock).not.toHaveBeenCalledWith('/api/leases/candidates', undefined);
  });

  it('says when there is nothing to show', async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]));
    renderPage();

    expect(await screen.findByText("You don't rent a home through Central House yet.")).toBeInTheDocument();
  });

  it('shows owners their tenants and tenancies ready for a lease', async () => {
    renderPage('/rent?as=owner');

    expect(await screen.findByText('Ready for a lease')).toBeInTheDocument();
    expect(screen.getByText(/Tenant: tenant_tia/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Homes I let' })).toHaveAttribute('aria-selected', 'true');
    expect(fetchMock).toHaveBeenCalledWith('/api/leases?as=owner', undefined);
  });

  it('sets up a lease prefilled from the application and opens it', async () => {
    renderPage('/rent?as=owner');

    await userEvent.click(await screen.findByRole('button', { name: 'Set up lease' }));
    const form = screen.getByRole('form', { name: 'Set up lease' });
    expect(within(form).getByLabelText('Monthly rent ($)')).toHaveValue(1250);
    expect(within(form).getByLabelText('Start date')).toHaveValue('2026-11-01');

    await userEvent.selectOptions(within(form).getByLabelText('Rent is due on the'), '5');
    await userEvent.type(within(form).getByLabelText('Notes for the tenant (optional)'), 'Pets welcome');
    await userEvent.click(within(form).getByRole('button', { name: 'Create lease' }));

    expect(await screen.findByText('Lease page new-lease')).toBeInTheDocument();
    const [, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({
      applicationId: 'app1',
      monthlyRent: 1250,
      dueDay: '5',
      startDate: '2026-11-01',
      endDate: '',
      notes: 'Pets welcome',
    });
  });

  it('shows why a lease could not be created', async () => {
    created = { success: false, message: 'The end date must be after the start date' };
    renderPage('/rent?as=owner');

    await userEvent.click(await screen.findByRole('button', { name: 'Set up lease' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create lease' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The end date must be after the start date');
  });

  it('can cancel setting up a lease', async () => {
    renderPage('/rent?as=owner');

    await userEvent.click(await screen.findByRole('button', { name: 'Set up lease' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('form', { name: 'Set up lease' })).not.toBeInTheDocument();
    expect(screen.getByText('Ready for a lease')).toBeInTheDocument();
  });
});
