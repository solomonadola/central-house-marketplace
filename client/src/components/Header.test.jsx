import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
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
});
