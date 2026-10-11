import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderButton = (currentUser) =>
  renderWithProviders(
    <Routes>
      <Route path='/' element={<FavoriteButton listingId='l1' />} />
      <Route path='/sign-in' element={<p>Sign in page</p>} />
    </Routes>,
    { currentUser }
  );

describe('FavoriteButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends signed-out users to sign in', async () => {
    renderButton(null);

    await userEvent.click(screen.getByRole('button', { name: 'Save listing' }));

    expect(screen.getByText('Sign in page')).toBeInTheDocument();
  });

  it('shows the saved state', () => {
    renderButton({ _id: 'u1', favorites: ['l1'] });

    expect(screen.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('works for users persisted before favorites existed', () => {
    renderButton({ _id: 'u1' });
    expect(screen.getByRole('button', { name: 'Save listing' })).toBeInTheDocument();
  });

  it('saves a listing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { favorites: ['l1'] }));
    vi.stubGlobal('fetch', fetchMock);
    const { store } = renderButton({ _id: 'u1', favorites: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Save listing' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/user/favorites/l1', { method: 'PUT' });
    await waitFor(() => expect(store.getState().user.currentUser.favorites).toEqual(['l1']));
    expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeInTheDocument();
  });

  it('removes a saved listing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { favorites: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { store } = renderButton({ _id: 'u1', favorites: ['l1'] });

    await userEvent.click(screen.getByRole('button', { name: 'Remove from saved' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/user/favorites/l1', { method: 'DELETE' });
    await waitFor(() => expect(store.getState().user.currentUser.favorites).toEqual([]));
  });

  it('rolls back when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { success: false, message: 'Listing not found!' })));
    const { store } = renderButton({ _id: 'u1', favorites: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Save listing' }));

    await waitFor(() => expect(store.getState().user.currentUser.favorites).toEqual([]));
    expect(screen.getByRole('button', { name: 'Save listing' })).toBeInTheDocument();
  });

  it('rolls back on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { store } = renderButton({ _id: 'u1', favorites: ['l1'] });

    await userEvent.click(screen.getByRole('button', { name: 'Remove from saved' }));

    await waitFor(() => expect(store.getState().user.currentUser.favorites).toEqual(['l1']));
  });
});
