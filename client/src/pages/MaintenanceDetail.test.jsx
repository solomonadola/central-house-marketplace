import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import MaintenanceDetail from './MaintenanceDetail';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date().toISOString();

const request = (overrides = {}) => ({
  _id: 'r1',
  title: 'Kitchen tap is leaking',
  description: 'Drips all night.',
  category: 'plumbing',
  urgency: 'urgent',
  status: 'open',
  createdAt: now,
  listing: { _id: 'l1', name: 'Garden Flat' },
  tenant: { username: 'tenant_user' },
  owner: { username: 'owner_user' },
  updates: [{ _id: 'u1', author: { username: 'owner_user' }, body: 'Plumber booked.', status: 'in_progress', createdAt: now }],
  ...overrides,
});

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path='/maintenance/:requestId' element={<MaintenanceDetail />} />
    </Routes>,
    { route: '/maintenance/r1', currentUser: { _id: 'owner' } }
  );

describe('Maintenance request page', () => {
  let fetchMock;
  let response;

  beforeEach(() => {
    response = { request: request(), viewer: { role: 'owner', allowedStatuses: ['in_progress', 'resolved'] } };
    fetchMock = vi.fn(async (url, options) =>
      options?.method === 'POST'
        ? jsonResponse({ request: request({ status: 'resolved' }), viewer: { role: 'owner', allowedStatuses: [] } })
        : jsonResponse(response)
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the request details and its timeline', async () => {
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Kitchen tap is leaking' })).toBeInTheDocument();
    expect(screen.getByText('Drips all night.')).toBeInTheDocument();
    expect(screen.getByText('tenant_user')).toBeInTheDocument();
    expect(screen.getByText('Plumber booked.')).toBeInTheDocument();
    expect(screen.getByText('marked it in progress')).toBeInTheDocument();
  });

  it('offers only the status changes the viewer is allowed', async () => {
    renderDetail();

    expect(await screen.findByRole('button', { name: 'Start work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark resolved' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close request' })).not.toBeInTheDocument();
  });

  it('posts an update with a status change', async () => {
    renderDetail();

    await userEvent.type(await screen.findByLabelText('Add an update'), 'Fixed the washer.');
    await userEvent.click(screen.getByRole('button', { name: 'Mark resolved' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/maintenance/r1/updates');
    expect(JSON.parse(options.body)).toEqual({ body: 'Fixed the washer.', status: 'resolved' });
    expect(await screen.findByText('Resolved')).toBeInTheDocument();
  });

  it('shows a closed request as closed', async () => {
    response = { request: request({ status: 'closed' }), viewer: { role: 'owner', allowedStatuses: [] } };
    renderDetail();

    expect(await screen.findByText('This request is closed.')).toBeInTheDocument();
  });

  it('shows not found for requests the user cannot see', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: false, message: 'Request not found!' }, 404));
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Request not found' })).toBeInTheDocument();
  });
});
