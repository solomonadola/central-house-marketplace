import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date().toISOString();

const users = [
  { _id: 'u1', username: 'sarah', email: 'sarah@example.com', role: 'user', suspended: false, emailVerified: true, listingCount: 2, createdAt: now },
  { _id: 'u2', username: 'spammer', email: 'spam@example.com', role: 'user', suspended: true, suspendedReason: 'Fake listings', emailVerified: false, listingCount: 1, createdAt: now },
  { _id: 'a1', username: 'moderator', email: 'mod@example.com', role: 'admin', suspended: false, emailVerified: true, listingCount: 0, createdAt: now },
];

describe('AdminUsers', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method ? { ok: true } : users));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists users with their status', async () => {
    renderWithProviders(<AdminUsers />);

    expect(await screen.findByText('sarah')).toBeInTheDocument();
    expect(screen.getByText(/2 listings/)).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText(/Suspended: Fake listings/)).toBeInTheDocument();
    expect(screen.getByText('Email not confirmed')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('searches after typing pauses', async () => {
    renderWithProviders(<AdminUsers />);
    await screen.findByText('sarah');

    await userEvent.type(screen.getByLabelText('Search users'), 'sar');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?search=sar', undefined));
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('search=s&') || url.endsWith('search=s'))).toHaveLength(0);
  });

  it('suspends a user with a reason', async () => {
    renderWithProviders(<AdminUsers />);

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    await userEvent.type(screen.getByLabelText('Reason for suspending'), 'Scam messages');
    await userEvent.click(screen.getByRole('button', { name: 'Suspend user' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/u1/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Scam messages' }),
    });
  });

  it('reinstates a suspended user', async () => {
    renderWithProviders(<AdminUsers />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reinstate' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/u2/unsuspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('offers no suspend action for admins', async () => {
    renderWithProviders(<AdminUsers />);
    await screen.findByText('moderator');

    // One Suspend button (sarah) and one Reinstate (spammer); none for the admin.
    expect(screen.getAllByRole('button', { name: 'Suspend' })).toHaveLength(1);
  });
});
