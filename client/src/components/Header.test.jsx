import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './Header';
import { renderWithProviders } from '../test/utils';

const ShowLocation = () => {
  const location = useLocation();
  return <p data-testid='location'>{location.pathname + location.search}</p>;
};

const renderHeader = (options) =>
  renderWithProviders(
    <>
      <Header />
      <Routes>
        <Route path='*' element={<ShowLocation />} />
      </Routes>
    </>,
    options
  );

describe('Header', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ count: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows a sign-in link when signed out', () => {
    renderHeader();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it("shows the user's avatar when signed in", () => {
    renderHeader({ currentUser: { _id: 'u1', avatar: 'https://example.com/me.png' } });
    expect(screen.getByAltText('profile')).toHaveAttribute('src', 'https://example.com/me.png');
  });

  it('links to saved listings with a count when signed in', () => {
    renderHeader({ currentUser: { _id: 'u1', favorites: ['a', 'b'] } });
    const link = screen.getByRole('link', { name: /saved listings/i });
    expect(link).toHaveAttribute('href', '/saved');
    expect(link).toHaveTextContent('2');
  });

  it('hides the saved link when signed out', () => {
    renderHeader();
    expect(screen.queryByRole('link', { name: /saved listings/i })).not.toBeInTheDocument();
  });

  it('fills the search box from the URL', () => {
    renderHeader({ route: '/search?searchTerm=villa' });
    expect(screen.getByPlaceholderText(/search/i)).toHaveValue('villa');
  });

  it('navigates to search results, keeping other filters', async () => {
    renderHeader({ route: '/search?type=rent&searchTerm=old' });
    const input = screen.getByPlaceholderText(/search/i);

    await userEvent.clear(input);
    await userEvent.type(input, 'garden{enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/search?type=rent&searchTerm=garden');
  });

  it('shows the unread message count from the server', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ count: 3 }), { status: 200 }));
    renderHeader({ currentUser: { _id: 'u1', favorites: [] } });

    expect(await screen.findByRole('link', { name: 'Messages, 3 unread' })).toHaveAttribute('href', '/messages');
    expect(fetchMock).toHaveBeenCalledWith('/api/messages/unread-count', undefined);
  });

  it('caps the badge at 9+', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ count: 12 }), { status: 200 }));
    renderHeader({ currentUser: { _id: 'u1', favorites: [] } });

    await waitFor(() => expect(screen.getByRole('link', { name: 'Messages, 12 unread' })).toHaveTextContent('9+'));
  });

  it('does not poll for messages when signed out', () => {
    renderHeader();

    expect(screen.queryByRole('link', { name: /messages/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
