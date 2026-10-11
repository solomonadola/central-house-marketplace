import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('password reset pages', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requests a reset link', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'If an account exists for that email, we sent a link.' }));
    renderWithProviders(<ForgotPassword />);

    await userEvent.type(screen.getByLabelText('Email'), 'sarah@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText(/we sent a link/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@example.com' }),
    });
  });

  const renderReset = () =>
    renderWithProviders(
      <Routes>
        <Route path='/reset-password/:token' element={<ResetPassword />} />
      </Routes>,
      { route: '/reset-password/tok123' }
    );

  it('sets a new password using the token from the link', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }));
    renderReset();

    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-pass');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'brand-new-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText(/Your password has been reset/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'tok123', password: 'brand-new-pass' }),
    });
  });

  it('checks that the passwords match', async () => {
    renderReset();

    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-pass');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers a new link when the token has expired', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: 'This reset link is invalid or has expired. Please request a new one.' }, 400)
    );
    renderReset();

    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-pass');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'brand-new-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password');
  });
});
