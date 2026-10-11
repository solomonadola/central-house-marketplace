import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notifications from './Notifications';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const notification = (overrides = {}) => ({
  _id: 'n1',
  type: 'message',
  title: 'New message from maria',
  body: 'About "Sunny Loft"',
  link: '/messages/c1',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Notifications page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET' && url.startsWith('/api/notifications?')) {
        return jsonResponse({
          notifications: [
            notification({ _id: 'n1', title: 'Unread one' }),
            notification({ _id: 'n2', title: 'Read two', read: true }),
          ],
          unreadCount: 1,
        });
      }
      if (method === 'POST' && url === '/api/notifications/read-all') return jsonResponse({ updated: 1 });
      if (method === 'PATCH') return jsonResponse(notification());
      if (method === 'DELETE') return jsonResponse({ deleted: 1 });
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists notifications and the unread count', async () => {
    renderWithProviders(<Notifications />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Unread one')).toBeInTheDocument();
    expect(screen.getByText('Read two')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unread \(1\)/ })).toBeInTheDocument();
  });

  it('filters to unread only', async () => {
    renderWithProviders(<Notifications />, { currentUser: { _id: 'me' } });
    await screen.findByText('Unread one');

    await userEvent.click(screen.getByRole('button', { name: 'Unread (1)' }));

    expect(screen.getByText('Unread one')).toBeInTheDocument();
    expect(screen.queryByText('Read two')).not.toBeInTheDocument();
  });

  it('marks all as read', async () => {
    renderWithProviders(<Notifications />, { currentUser: { _id: 'me' } });
    await screen.findByText('Unread one');

    await userEvent.click(screen.getByRole('button', { name: /Mark all read/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/notifications/read-all', { method: 'POST' });
    });
    expect(screen.queryByRole('button', { name: /Mark all read/ })).not.toBeInTheDocument();
  });

  it('removes a notification', async () => {
    renderWithProviders(<Notifications />, { currentUser: { _id: 'me' } });
    await screen.findByText('Unread one');

    await userEvent.click(screen.getByRole('button', { name: 'Remove notification: Unread one' }));

    await waitFor(() => expect(screen.queryByText('Unread one')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications/n1', { method: 'DELETE' });
  });

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ notifications: [], unreadCount: 0 }));
    renderWithProviders(<Notifications />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });
});
