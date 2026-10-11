import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from './Profile';
import { makeListing, renderWithProviders } from '../test/utils';

// Avatar uploads use Firebase Storage, which isn't needed here.
vi.mock('firebase/storage', () => ({}));

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const user = { _id: 'u1', username: 'sarah', email: 'sarah@example.com', avatar: 'https://example.com/me.png' };

describe('Profile page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options) => {
      if (url === '/api/user/listings/u1') return jsonResponse([makeListing({ _id: 'l1', name: 'My Garden Flat Listing', views: 12 })]);
      if (options?.method === 'DELETE') return jsonResponse('deleted');
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the user's listings straight away", async () => {
    renderWithProviders(<Profile />, { currentUser: user });

    expect(await screen.findByText('My Garden Flat Listing')).toBeInTheDocument();
    expect(screen.getByText('12 views')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/update-listing/l1');
  });

  it('asks before deleting the account', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<Profile />, { currentUser: user });
    await screen.findByText('My Garden Flat Listing');

    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(confirm).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/user/delete/u1')).toBe(false);
  });

  it('asks before deleting a listing, then removes it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<Profile />, { currentUser: user });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith(`Delete "My Garden Flat Listing"? This can't be undone.`);
    await waitFor(() => expect(screen.queryByText('My Garden Flat Listing')).not.toBeInTheDocument());
  });
});
