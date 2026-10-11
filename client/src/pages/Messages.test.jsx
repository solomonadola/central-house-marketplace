import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Messages from './Messages';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const now = new Date().toISOString();
const inbox = [
  {
    _id: 'c1',
    listing: { _id: 'l1', name: 'Sunny Loft Apartment' },
    otherUser: { _id: 'u2', username: 'maria' },
    lastMessage: { body: 'Is it available?', sender: 'u2', createdAt: now },
    unreadCount: 1,
  },
];

const renderMessages = (route) =>
  renderWithProviders(
    <Routes>
      <Route path='/messages' element={<Messages />} />
      <Route path='/messages/:conversationId' element={<Messages />} />
    </Routes>,
    { route, currentUser: { _id: 'me' } }
  );

describe('Messages page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) => {
      if (url === '/api/messages/conversations') return jsonResponse(inbox);
      if (url === '/api/messages/unread-count') return jsonResponse({ count: 0 });
      if (url === '/api/messages/conversations/c1') {
        return jsonResponse({
          conversation: inbox[0],
          messages: [{ _id: 'm1', body: 'Is it available?', sender: 'u2', createdAt: now }],
          hasMore: false,
        });
      }
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists conversations and prompts to pick one', async () => {
    renderMessages('/messages');

    expect(await screen.findByText('maria')).toBeInTheDocument();
    expect(screen.getByText('Select a conversation')).toBeInTheDocument();
  });

  it('opens a conversation from the list', async () => {
    renderMessages('/messages');

    await userEvent.click(await screen.findByRole('link', { name: /maria/ }));

    expect(await screen.findByLabelText('Message')).toBeInTheDocument();
  });

  it('refreshes the inbox and unread count after opening a conversation', async () => {
    renderMessages('/messages/c1');

    await screen.findByLabelText('Message');
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls.filter((u) => u === '/api/messages/conversations').length).toBeGreaterThanOrEqual(2);
      expect(urls).toContain('/api/messages/unread-count');
    });
  });

  it('shows an error when the inbox fails to load', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderMessages('/messages');

    expect(await screen.findByText('Could not load your messages.')).toBeInTheDocument();
  });

  it('filters conversations by search', async () => {
    renderMessages('/messages');
    await screen.findByText('maria');

    await userEvent.type(screen.getByLabelText('Search conversations'), 'nothing matches');

    expect(await screen.findByText(/No conversations match/)).toBeInTheDocument();
    expect(screen.queryByText('maria')).not.toBeInTheDocument();
  });

  it('marks all conversations as read', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/messages/read-all' && options?.method === 'POST') return jsonResponse({ updated: 1 });
      if (url === '/api/messages/conversations') return jsonResponse(inbox);
      if (url === '/api/messages/unread-count') return jsonResponse({ count: 0 });
      return jsonResponse({}, 404);
    });
    renderMessages('/messages');
    await screen.findByText('maria');

    await userEvent.click(screen.getByRole('button', { name: 'Mark all messages as read' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/messages/read-all', { method: 'POST' });
    });
  });

  it('exports the conversations to CSV', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url === '/api/messages/conversations/export') {
        return new Response('With,Listing\nmaria,Loft\n', { headers: { 'Content-Type': 'text/csv' } });
      }
      if (url === '/api/messages/conversations') return jsonResponse(inbox);
      if (url === '/api/messages/unread-count') return jsonResponse({ count: 0 });
      return jsonResponse({}, 404);
    });
    renderMessages('/messages');
    await screen.findByText('maria');
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await userEvent.click(screen.getByRole('button', { name: 'Export conversations' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/messages/conversations/export')).toBe(true);
    });
  });
});
