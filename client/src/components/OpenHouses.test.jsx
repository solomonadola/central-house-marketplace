import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenHouses from './OpenHouses';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const event = (overrides = {}) => ({
  _id: 'o1',
  startsAt: new Date(2030, 2, 14, 10, 0).toISOString(),
  endsAt: new Date(2030, 2, 14, 12, 0).toISOString(),
  note: 'Ring the top bell',
  capacity: 10,
  rsvpCount: 3,
  isFull: false,
  viewer: { isOwner: false, rsvped: false },
  ...overrides,
});

describe('OpenHouses', () => {
  let fetchMock;
  let events;

  beforeEach(() => {
    events = [event()];
    fetchMock = vi.fn(async (url, options) => jsonResponse(options?.method ? { ok: true } : events));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows upcoming open houses and lets visitors RSVP', async () => {
    renderWithProviders(<OpenHouses listingId='l1' isOwner={false} />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Thu, Mar 14 · 10:00 AM – 12:00 PM')).toBeInTheDocument();
    expect(screen.getByText(/3 of 10 going/)).toBeInTheDocument();
    expect(screen.getByText('Ring the top bell')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: "I'll be there" }));
    expect(fetchMock).toHaveBeenCalledWith('/api/open-houses/o1/rsvp', { method: 'POST' });
  });

  it('lets visitors cancel their RSVP', async () => {
    events = [event({ viewer: { isOwner: false, rsvped: true } })];
    renderWithProviders(<OpenHouses listingId='l1' isOwner={false} />, { currentUser: { _id: 'me' } });

    await userEvent.click(await screen.findByRole('button', { name: /Cancel RSVP/ }));
    expect(fetchMock).toHaveBeenCalledWith('/api/open-houses/o1/rsvp', { method: 'DELETE' });
  });

  it('disables RSVPs when full and asks signed-out visitors to sign in', async () => {
    events = [event({ isFull: true, rsvpCount: 10 })];
    const { unmount } = renderWithProviders(<OpenHouses listingId='l1' isOwner={false} />, { currentUser: { _id: 'me' } });
    expect(await screen.findByRole('button', { name: 'Full' })).toBeDisabled();
    unmount();

    renderWithProviders(<OpenHouses listingId='l1' isOwner={false} />);
    expect(await screen.findByRole('link', { name: 'Sign in to RSVP' })).toHaveAttribute('href', '/sign-in');
  });

  it('is hidden from visitors when nothing is scheduled', async () => {
    events = [];
    const { container } = renderWithProviders(<OpenHouses listingId='l1' isOwner={false} />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lets the owner schedule one', async () => {
    events = [];
    renderWithProviders(<OpenHouses listingId='l1' isOwner />, { currentUser: { _id: 'owner' } });

    await userEvent.click(await screen.findByRole('button', { name: /Schedule an open house/ }));
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2030-03-14T10:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2030-03-14T12:00' } });
    await userEvent.type(screen.getByLabelText('Spaces (optional)'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/open-houses/listing/l1');
    expect(JSON.parse(options.body)).toEqual({
      startsAt: new Date('2030-03-14T10:00').toISOString(),
      endsAt: new Date('2030-03-14T12:00').toISOString(),
      capacity: 15,
      note: '',
    });
  });

  it('shows the owner who is coming and lets them cancel', async () => {
    events = [event({ viewer: { isOwner: true, rsvped: false }, attendees: [{ username: 'maria' }, { username: 'david' }] })];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<OpenHouses listingId='l1' isOwner />, { currentUser: { _id: 'owner' } });

    expect(await screen.findByText('Coming: maria, david')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel open house' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/open-houses/o1/cancel', { method: 'POST' });
  });
});
