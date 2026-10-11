import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Settings page', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'PATCH') return jsonResponse(JSON.parse(options.body));
      return jsonResponse({ emailNotifications: true, marketingEmails: false });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the current preferences', async () => {
    renderWithProviders(<Settings />, { currentUser: { _id: 'me' } });

    const emailToggle = await screen.findByRole('checkbox', { name: 'Email me about activity' });
    expect(emailToggle).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Product news and tips' })).not.toBeChecked();
  });

  it('saves a changed preference', async () => {
    renderWithProviders(<Settings />, { currentUser: { _id: 'me' } });
    const emailToggle = await screen.findByRole('checkbox', { name: 'Email me about activity' });

    await userEvent.click(emailToggle);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(screen.getByText('Settings saved.')).toBeInTheDocument());
    const patch = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ emailNotifications: false, marketingEmails: false });
  });

  it('shows a load error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithProviders(<Settings />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText(/Could not load your preferences/)).toBeInTheDocument();
  });
});
