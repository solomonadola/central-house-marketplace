import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Applications from './Applications';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const application = (overrides = {}) => ({
  _id: 'app1',
  listing: { _id: 'l1', name: 'Sunny Loft Apartment' },
  applicant: { _id: 'u2', username: 'maria' },
  owner: { _id: 'me', username: 'me' },
  fullName: 'Maria Rossi',
  email: 'maria@example.com',
  phone: '555-0100',
  message: 'We would love this place',
  occupants: 2,
  income: 90000,
  status: 'submitted',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const renderApplications = (route = '/applications', data = [application()]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') return jsonResponse(data);
      if (method === 'PATCH') return jsonResponse(application({ status: 'approved' }));
      if (method === 'DELETE') return jsonResponse('Application deleted!');
      return jsonResponse({ success: false }, 404);
    })
  );
  return renderWithProviders(
    <Routes>
      <Route path='/applications' element={<Applications />} />
    </Routes>,
    { route, currentUser: { _id: 'me' } }
  );
};

describe('Applications page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the applications you submitted', async () => {
    renderApplications();

    expect(await screen.findByText('Sunny Loft Apartment')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText(/2 occupants/)).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    renderApplications('/applications', []);
    expect(await screen.findByText(/haven't applied to any listings/)).toBeInTheDocument();
  });

  it('lets an applicant withdraw', async () => {
    renderApplications();
    await screen.findByText('Sunny Loft Apartment');

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/applications/app1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('shows the received tab with owner actions and contact details', async () => {
    renderApplications('/applications?role=owner');

    expect(await screen.findByText('Sunny Loft Apartment')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toHaveAttribute('href', 'mailto:maria@example.com');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('lets the owner approve', async () => {
    renderApplications('/applications?role=owner');
    await screen.findByText('Sunny Loft Apartment');

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/applications/app1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('offers delete for a decided application', async () => {
    renderApplications('/applications', [application({ status: 'rejected' })]);
    await screen.findByText('Sunny Loft Apartment');

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/applications/app1', { method: 'DELETE' });
    });
  });
});
