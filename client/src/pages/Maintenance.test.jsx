import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import Maintenance from './Maintenance';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date().toISOString();

const requests = [
  { _id: 'r1', title: 'Broken boiler again', category: 'heating', urgency: 'urgent', status: 'open', updatedAt: now, listing: { name: 'Garden Flat' }, tenant: { username: 'tenant_user' } },
  { _id: 'r2', title: 'Loose stair railing', category: 'structural', urgency: 'normal', status: 'resolved', updatedAt: now, listing: { name: 'Garden Flat' } },
];

const Detail = () => <p>Detail {useParams().requestId}</p>;

const renderPage = (route = '/maintenance') =>
  renderWithProviders(
    <Routes>
      <Route path='/maintenance' element={<Maintenance />} />
      <Route path='/maintenance/:requestId' element={<Detail />} />
    </Routes>,
    { route, currentUser: { _id: 'me' } }
  );

describe('Maintenance page', () => {
  let fetchMock;
  let eligible;

  beforeEach(() => {
    eligible = [{ _id: 'l1', name: 'Garden Flat' }];
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse({ _id: 'new-request' }, 201);
      if (url === '/api/maintenance/eligible') return jsonResponse(eligible);
      if (url === '/api/maintenance/summary') return jsonResponse({ open: 2, in_progress: 1, resolved: 0, closed: 4, urgentOpen: 1 });
      return jsonResponse(requests);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lists the tenant's requests with status and urgency", async () => {
    renderPage();

    expect(await screen.findByText('Broken boiler again')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Loose stair railing/ })).getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Broken boiler again/ })).toHaveAttribute('href', '/maintenance/r1');
    expect(fetchMock).toHaveBeenCalledWith('/api/maintenance?', undefined);
  });

  it('shows owners a summary and filters by status', async () => {
    renderPage('/maintenance?as=owner');

    expect(await screen.findByText('3 requests need attention')).toBeInTheDocument();
    expect(screen.getByText('1 urgent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Report a problem/ })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'open');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/maintenance?as=owner&status=open', undefined));
  });

  it('lets tenants report a problem and opens it', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Report a problem/ }));
    await userEvent.type(screen.getByLabelText("What's wrong?"), 'Kitchen tap is leaking');
    await userEvent.selectOptions(screen.getByLabelText('Urgency'), 'urgent');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText('Detail new-request')).toBeInTheDocument();
    const [, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({
      listingId: 'l1',
      title: 'Kitchen tap is leaking',
      description: '',
      category: 'plumbing',
      urgency: 'urgent',
    });
  });

  it('explains how to become eligible', async () => {
    eligible = [];
    renderPage();

    expect(await screen.findByText(/Once an owner approves your rental application/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Report a problem/ })).not.toBeInTheDocument();
  });
});
