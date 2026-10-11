import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import ConversationList from './ConversationList';
import { renderWithProviders } from '../test/utils';

const conversation = (overrides = {}) => ({
  _id: 'c1',
  listing: { _id: 'l1', name: 'Sunny Loft Apartment', imageUrl: null },
  otherUser: { _id: 'u2', username: 'maria', avatar: 'https://example.com/maria.png' },
  isOwner: false,
  lastMessage: { body: 'Is it available?', sender: 'u2', createdAt: new Date().toISOString() },
  unreadCount: 0,
  ...overrides,
});

const renderList = (conversations, activeId) =>
  renderWithProviders(<ConversationList conversations={conversations} activeId={activeId} currentUserId='me' />);

describe('ConversationList', () => {
  it('shows the other user, listing and last message', () => {
    renderList([conversation()]);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/messages/c1');
    expect(within(link).getByText('maria')).toBeInTheDocument();
    expect(within(link).getByText('Sunny Loft Apartment')).toBeInTheDocument();
    expect(within(link).getByText('Is it available?')).toBeInTheDocument();
    expect(within(link).getByText('just now')).toBeInTheDocument();
  });

  it('prefixes my own last message with "You:"', () => {
    renderList([conversation({ lastMessage: { body: 'Thanks!', sender: 'me', createdAt: new Date().toISOString() } })]);
    expect(screen.getByText(/You:/)).toHaveTextContent('You: Thanks!');
  });

  it('shows the unread count', () => {
    renderList([conversation({ unreadCount: 2 })]);
    expect(screen.getByText('2', { exact: false })).toHaveTextContent('2 unread');
  });

  it('marks the open conversation', () => {
    renderList([conversation(), conversation({ _id: 'c2' })], 'c2');
    const [first, second] = screen.getAllByRole('link');
    expect(first).not.toHaveAttribute('aria-current');
    expect(second).toHaveAttribute('aria-current', 'page');
  });

  it('handles a deleted listing and user', () => {
    renderList([conversation({ listing: null, otherUser: null })]);
    expect(screen.getByText('Deleted user')).toBeInTheDocument();
    expect(screen.getByText('Listing removed')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderList([]);
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });
});
