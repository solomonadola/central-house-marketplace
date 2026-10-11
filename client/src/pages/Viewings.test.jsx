import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Viewings from './Viewings';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const DAY = 24 * 60 * 60 * 1000;

const viewing = (overrides) => ({
  _id: 'v1',
  status: 'pending',
  startsAt: new Date(Date.now() + 2 * DAY).toISOString(),
  note: 'After 5pm please',
  responseNote: '',
  listing: { _id: 'l1', name: 'Sunny Loft Apartment' },
  requester: { username: 'buyer_user' },
  owner: { username: 'owner_user' },
  ...overrides,
});

describe('Viewings page', () => {
  let fetchMock;
  let data;

  beforeEach(() => {
    data = [
      viewing({ _id: 'v1' }),
      viewing({ _id: 'v2', status: 'accepted', startsAt: new Date(Date.now() - 3 * DAY).toISOString(), note: '' }),
    ];
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method ? { ok: true } : data));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('splits my requests into upcoming and past', async () => {
    renderWithProviders(<Viewings />, { route: '/viewings' });

    const upcoming = (await screen.findByRole('heading', { name: 'Upcoming' })).parentElement;
    const past = screen.getByRole('heading', { name: 'Past' }).parentElement;
    expect(within(upcoming).getByText('pending')).toBeInTheDocument();
    expect(within(upcoming).getByText(/with owner_user/)).toBeInTheDocument();
    expect(within(upcoming).getByText('“After 5pm please”')).toBeInTheDocument();
    expect(within(past).getByText('accepted')).toBeInTheDocument();
    // Past viewings can't be cancelled.
    expect(within(past).queryByRole('button')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/viewings', undefined);
  });

  it('lets requesters cancel an upcoming viewing', async () => {
    renderWithProviders(<Viewings />, { route: '/viewings' });

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel viewing' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/viewings/v1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
  });

  it('lets owners accept or decline requests on their listings', async () => {
    renderWithProviders(<Viewings />, { route: '/viewings?as=owner' });

    expect(await screen.findAllByText(/requested by buyer_user/)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/viewings?as=owner', undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    const patch = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patch[0]).toBe('/api/viewings/v1');
    expect(JSON.parse(patch[1].body)).toEqual({ action: 'accept' });
  });

  it('shows empty states', async () => {
    data = [];
    renderWithProviders(<Viewings />, { route: '/viewings?as=owner' });
    expect(await screen.findByText(/Nobody has requested a viewing/)).toBeInTheDocument();
  });
});
