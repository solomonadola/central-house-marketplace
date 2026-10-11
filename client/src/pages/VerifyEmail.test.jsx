import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import VerifyEmail from './VerifyEmail';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderPage = (currentUser = null) =>
  renderWithProviders(
    <Routes>
      <Route path='/verify-email/:token' element={<VerifyEmail />} />
    </Routes>,
    { route: '/verify-email/tok123', currentUser }
  );

describe('VerifyEmail page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({ _id: 'u1', username: 'sarah', emailVerified: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('confirms the email once and updates the signed-in user', async () => {
    const { store } = renderPage({ _id: 'u1', username: 'sarah', emailVerified: false });

    expect(await screen.findByText(/your email is confirmed/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'tok123' }),
    });
    await waitFor(() => expect(store.getState().user.currentUser.emailVerified).toBe(true));
    expect(screen.getByRole('link', { name: 'Post a listing' })).toBeInTheDocument();
  });

  it('asks signed-out users to sign in', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('does not touch a different signed-in account', async () => {
    const { store } = renderPage({ _id: 'other', emailVerified: false });

    await screen.findByText(/your email is confirmed/);
    expect(store.getState().user.currentUser).toEqual({ _id: 'other', emailVerified: false });
  });

  it('shows why a link failed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: 'This confirmation link is invalid or has expired.' }, 400)
    );
    renderPage();

    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
  });
});
