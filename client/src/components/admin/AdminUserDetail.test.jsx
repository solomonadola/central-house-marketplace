import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import AdminUserDetail from './AdminUserDetail';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const detail = {
  user: {
    _id: 'u2',
    username: 'target_user',
    email: 'target@example.com',
    avatar: 'https://example.com/a.png',
    role: 'user',
    suspended: true,
    suspendedReason: 'Spam',
    emailVerified: false,
    createdAt: new Date().toISOString(),
  },
  stats: { listings: 3, hidden: 1, paused: 1, openReports: 2, reviews: 0, applicationsReceived: 1, depositsReceived: 1, depositsReceivedAmount: 900 },
  listings: [
    { _id: 'l1', name: 'Visible Target Listing', hidden: false, active: true, views: 10 },
    { _id: 'l2', name: 'Hidden Target Listing', hidden: true, active: true, views: 2 },
  ],
  recentActions: [],
};

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path='/admin/user/:userId' element={<AdminUserDetail />} />
    </Routes>,
    { route: '/admin/user/u2', currentUser: { _id: 'a1', role: 'admin' } }
  );

describe('AdminUserDetail', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the user, stats and listings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(detail)));
    renderDetail();

    expect(await screen.findByText('target_user')).toBeInTheDocument();
    expect(screen.getByText('target@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Suspended: Spam/)).toBeInTheDocument();
    expect(screen.getByText('Open reports').nextSibling).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Visible Target Listing' })).toHaveAttribute('href', '/listing/l1');
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
  });

  it('lists recent admin actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ ...detail, recentActions: [{ _id: 'a1', action: 'hide_listing', targetLabel: 'Some Listing', createdAt: new Date().toISOString() }] })
      )
    );
    renderDetail();

    expect(await screen.findByText(/Hid a listing/)).toBeInTheDocument();
  });

  it('shows an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false, message: 'User not found!' }, 404)));
    renderDetail();

    expect(await screen.findByText('User not found!')).toBeInTheDocument();
  });
});
