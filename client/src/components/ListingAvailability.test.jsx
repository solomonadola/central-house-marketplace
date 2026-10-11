import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingAvailability from './ListingAvailability';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const openSlot = { _id: 's1', startsAt: '2030-03-14T15:00:00.000Z', endsAt: '2030-03-14T16:00:00.000Z', status: 'open' };
const bookedSlot = {
  _id: 's2',
  startsAt: '2030-03-15T15:00:00.000Z',
  endsAt: '2030-03-15T16:00:00.000Z',
  status: 'booked',
};

describe('ListingAvailability', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET' && url === '/api/availability/l1') return jsonResponse([openSlot, bookedSlot]);
      if (method === 'POST' && url === '/api/availability/l1') return jsonResponse([openSlot], 201);
      if (method === 'DELETE' && url.startsWith('/api/availability/slot/')) return jsonResponse('Slot removed!');
      if (method === 'DELETE' && url === '/api/availability/l1') return jsonResponse({ deleted: 1 });
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists slots and marks booked ones', async () => {
    renderWithProviders(<ListingAvailability listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText(/· booked/)).toBeInTheDocument();
    // A booked slot has no remove button; the open one does.
    expect(screen.getAllByRole('button', { name: /Remove slot/ })).toHaveLength(1);
  });

  it('adds a slot with the chosen duration', async () => {
    renderWithProviders(<ListingAvailability listingId='l1' />, { currentUser: { _id: 'me' } });
    await screen.findByText(/· booked/);

    fireEvent.change(screen.getByLabelText('Slot date'), { target: { value: '2030-04-01' } });
    fireEvent.change(screen.getByLabelText('Slot start time'), { target: { value: '09:00' } });
    await userEvent.selectOptions(screen.getByLabelText('Slot duration'), '90');
    await userEvent.click(screen.getByRole('button', { name: /Add slot/ }));

    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
    const body = JSON.parse(post[1].body);
    const start = new Date(body.slots[0].startsAt);
    const end = new Date(body.slots[0].endsAt);
    expect(end.getTime() - start.getTime()).toBe(90 * 60_000);
  });

  it('asks for a date and time before adding', async () => {
    renderWithProviders(<ListingAvailability listingId='l1' />, { currentUser: { _id: 'me' } });
    await screen.findByText(/· booked/);

    await userEvent.click(screen.getByRole('button', { name: /Add slot/ }));

    expect(screen.getByText('Pick a date and a start time.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });

  it('removes an open slot', async () => {
    renderWithProviders(<ListingAvailability listingId='l1' />, { currentUser: { _id: 'me' } });
    await screen.findByText(/· booked/);

    await userEvent.click(screen.getByRole('button', { name: /Remove slot/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/availability/slot/s1', { method: 'DELETE' });
    });
  });

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    renderWithProviders(<ListingAvailability listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('No slots yet.')).toBeInTheDocument();
  });
});
