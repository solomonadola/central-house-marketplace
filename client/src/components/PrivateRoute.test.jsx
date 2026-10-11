import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { renderWithProviders } from '../test/utils';

const routes = (
  <Routes>
    <Route path='/sign-in' element={<p>Sign in page</p>} />
    <Route element={<PrivateRoute />}>
      <Route path='/profile' element={<p>Profile page</p>} />
    </Route>
  </Routes>
);

describe('PrivateRoute', () => {
  it('renders the page for a signed-in user', () => {
    renderWithProviders(routes, { route: '/profile', currentUser: { _id: 'u1' } });
    expect(screen.getByText('Profile page')).toBeInTheDocument();
  });

  it('redirects to sign-in when signed out', () => {
    renderWithProviders(routes, { route: '/profile' });
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('Profile page')).not.toBeInTheDocument();
  });
});
