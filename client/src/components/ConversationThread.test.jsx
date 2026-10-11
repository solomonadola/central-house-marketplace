import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationThread from './ConversationThread';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let seq = 0;
const message = (body, sender, minutesAgo = 0) => ({
  _id: `m${seq++}`,
  body,
  sender,
  createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
});

const conversation = {
  _id: 'c1',
  listing: { _id: 'l1', name: 'Sunny Loft Apartment' },
  otherUser: { _id: 'u2', username: 'maria' },
};

describe('ConversationThread', () => {
  let fetchMock;
  let latest;

  beforeEach(() => {
    latest = { conversation, messages: [message('Hi there', 'u2', 5), message('Hello!', 'me', 4)], hasMore: false };
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') {
        const { body } = JSON.parse(options.body);
        return jsonResponse(message(body, 'me'), 201);
      }
      return jsonResponse(latest);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const renderThread = (onActivity = vi.fn()) => {
    renderWithProviders(<ConversationThread conversationId='c1' onActivity={onActivity} />, {
      currentUser: { _id: 'me' },
    });
    return onActivity;
  };

  it('shows the messages and who the conversation is with', async () => {
    const onActivity = renderThread();

    expect(await screen.findByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('maria')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sunny Loft Apartment' })).toHaveAttribute('href', '/listing/l1');
    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('sends a message', async () => {
    const onActivity = renderThread();
    await screen.findByText('Hi there');

    await userEvent.type(screen.getByLabelText('Message'), 'Can I visit on Saturday?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Can I visit on Saturday?')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/messages/conversations/c1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Can I visit on Saturday?' }),
    });
    expect(screen.getByLabelText('Message')).toHaveValue('');
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('sends with Enter and adds a newline with Shift+Enter', async () => {
    renderThread();
    await screen.findByText('Hi there');
    const input = screen.getByLabelText('Message');

    await userEvent.type(input, 'Line one{Shift>}{Enter}{/Shift}Line two');
    expect(input).toHaveValue('Line one\nLine two');

    await userEvent.type(input, '{Enter}');
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('does not send an empty message', async () => {
    renderThread();
    await screen.findByText('Hi there');

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('shows an error when sending fails', async () => {
    fetchMock.mockImplementation(async (url, options) =>
      options?.method === 'POST'
        ? jsonResponse({ success: false, message: 'You are sending messages too quickly.' }, 429)
        : jsonResponse(latest)
    );
    renderThread();
    await screen.findByText('Hi there');

    await userEvent.type(screen.getByLabelText('Message'), 'Spam');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('You are sending messages too quickly.')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('Spam');
  });

  it('picks up new messages while open', async () => {
    const onActivity = vi.fn();
    renderWithProviders(<ConversationThread conversationId='c1' onActivity={onActivity} pollMs={50} />, {
      currentUser: { _id: 'me' },
    });
    await screen.findByText('Hi there');

    latest = { ...latest, messages: [...latest.messages, message('Saturday works!', 'u2')] };

    expect(await screen.findByText('Saturday works!')).toBeInTheDocument();
    await waitFor(() => expect(onActivity).toHaveBeenCalledTimes(2));
  });

  it('loads older messages', async () => {
    const older = message('Earlier question', 'me', 60);
    latest = { ...latest, hasMore: true };
    fetchMock.mockImplementation(async (url) =>
      url.includes('before=') ? jsonResponse({ conversation, messages: [older], hasMore: false }) : jsonResponse(latest)
    );
    renderThread();
    await screen.findByText('Hi there');

    await userEvent.click(screen.getByRole('button', { name: 'Load older messages' }));

    expect(await screen.findByText('Earlier question')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older messages' })).not.toBeInTheDocument();
  });

  it('shows an error for a conversation that does not exist', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: false, message: 'Conversation not found!' }, 404));
    renderThread();

    expect(await screen.findByText('Conversation not found.')).toBeInTheDocument();
  });
});
