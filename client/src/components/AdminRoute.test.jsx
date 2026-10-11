import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import { renderWithProviders } from '../test/utils';

const routes = (
  <Routes>
    <Route path='/' element={<p>Home page</p>} />
    <Route path='/sign-in' element={<p>Sign in page</p>} />
    <Route element={<AdminRoute />}>
      <Route path='/admin' element={<p>Admin page</p>} />
    </Route>
  </Routes>
);

describe('AdminRoute', () => {
  it('shows the page to admins', () => {
    renderWithProviders(routes, { route: '/admin', currentUser: { _id: 'a', role: 'admin' } });
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });

  it('sends regular users home', () => {
    renderWithProviders(routes, { route: '/admin', currentUser: { _id: 'u', role: 'user' } });
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in', () => {
    renderWithProviders(routes, { route: '/admin' });
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
  });
});
