import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationList from './NotificationList';
import { renderWithProviders } from '../test/utils';

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

describe('NotificationList', () => {
  it('renders the title, body and relative time', () => {
    renderWithProviders(<NotificationList notifications={[notification()]} />);

    expect(screen.getByText('New message from maria')).toBeInTheDocument();
    expect(screen.getByText('About "Sunny Loft"')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('links a notification to its destination and calls onOpen', async () => {
    const onOpen = vi.fn();
    renderWithProviders(<NotificationList notifications={[notification()]} onOpen={onOpen} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/messages/c1');

    await userEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith('n1');
  });

  it('uses a button when there is no link', async () => {
    const onOpen = vi.fn();
    renderWithProviders(<NotificationList notifications={[notification({ link: '' })]} onOpen={onOpen} />);

    const button = screen.getByRole('button', { name: /New message from maria/ });
    await userEvent.click(button);

    expect(onOpen).toHaveBeenCalledWith('n1');
  });

  it('shows an unread indicator only for unread notifications', () => {
    renderWithProviders(
      <NotificationList notifications={[notification({ _id: 'a' }), notification({ _id: 'b', read: true })]} />
    );

    expect(screen.getAllByLabelText('Unread')).toHaveLength(1);
  });

  it('calls onRemove from the remove button', async () => {
    const onRemove = vi.fn();
    renderWithProviders(<NotificationList notifications={[notification()]} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove notification: New message from maria' }));

    expect(onRemove).toHaveBeenCalledWith('n1');
  });

  it('hides the remove button when no handler is given', () => {
    renderWithProviders(<NotificationList notifications={[notification()]} />);
    expect(screen.queryByRole('button', { name: /Remove notification/ })).not.toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderWithProviders(<NotificationList notifications={[]} emptyText='Nothing here.' />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });
});
