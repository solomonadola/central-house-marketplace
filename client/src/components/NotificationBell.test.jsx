import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from './NotificationBell';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const notification = (overrides = {}) => ({
  _id: 'n1',
  type: 'viewing_accepted',
  title: 'Viewing accepted',
  body: 'For "Sunny Loft"',
  link: '/viewings',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationBell', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (url === '/api/notifications/unread-count') return jsonResponse({ count: 1 });
      if (url.startsWith('/api/notifications?')) return jsonResponse({ notifications: [notification()], unreadCount: 1 });
      if (method === 'POST' && url === '/api/notifications/read-all') return jsonResponse({ updated: 1 });
      if (method === 'PATCH') return jsonResponse(notification({ read: true }));
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders nothing when signed out', () => {
    const { container } = renderWithProviders(<NotificationBell />, { currentUser: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unread badge', async () => {
    renderWithProviders(<NotificationBell />, {
      currentUser: { _id: 'me' },
      notifications: [notification()],
    });

    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens a dropdown that loads and lists notifications', async () => {
    renderWithProviders(<NotificationBell />, {
      currentUser: { _id: 'me' },
      notifications: [notification()],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));

    expect(await screen.findByText('Viewing accepted')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/notifications');
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/notifications?limit=8');
  });

  it('marks all read from the dropdown', async () => {
    renderWithProviders(<NotificationBell />, {
      currentUser: { _id: 'me' },
      notifications: [notification()],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    await userEvent.click(await screen.findByRole('button', { name: /Mark all read/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/notifications/read-all', { method: 'POST' });
    });
  });
});
