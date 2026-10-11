import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestViewing from './RequestViewing';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('RequestViewing', () => {
  let fetchMock;
  let viewingResponse;

  beforeEach(() => {
    viewingResponse = { body: { _id: 'v1', status: 'pending' }, status: 201 };
    fetchMock = vi.fn(async (url) => {
      if (url.startsWith('/api/availability/')) return jsonResponse([]);
      return jsonResponse(viewingResponse.body, viewingResponse.status);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const viewingCall = () => fetchMock.mock.calls.find(([url]) => url === '/api/viewings');

  const openForm = async () => {
    renderWithProviders(<RequestViewing listingId='l1' />);
    await userEvent.click(screen.getByRole('button', { name: /Request a viewing/ }));
  };

  it('sends the chosen time as an instant with the time zone', async () => {
    await openForm();

    fireEvent.change(screen.getByLabelText(/When would you like/), { target: { value: '2030-03-14T15:30' } });
    await userEvent.type(screen.getByLabelText('Note for the owner'), 'Weekday afternoons work best');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText(/Viewing requested!/)).toBeInTheDocument();
    const body = JSON.parse(viewingCall()[1].body);
    expect(body).toEqual({
      listingId: 'l1',
      startsAt: new Date('2030-03-14T15:30').toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      note: 'Weekday afternoons work best',
    });
    expect(screen.getByRole('link', { name: 'See your viewings' })).toHaveAttribute('href', '/viewings');
  });

  it('asks for a time first', async () => {
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(screen.getByText('Please choose a date and time.')).toBeInTheDocument();
    expect(viewingCall()).toBeUndefined();
  });

  it('shows errors from the server', async () => {
    viewingResponse = {
      body: { success: false, message: 'You already have an upcoming viewing request for this listing.' },
      status: 409,
    };
    await openForm();

    fireEvent.change(screen.getByLabelText(/When would you like/), { target: { value: '2030-03-14T15:30' } });
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText(/already have an upcoming viewing request/)).toBeInTheDocument();
  });

  it('offers the owner availability slots instead of a free time picker', async () => {
    const slotStart = new Date('2030-03-14T15:00:00Z').toISOString();
    fetchMock = vi.fn(async (url) => {
      if (url.startsWith('/api/availability/')) return jsonResponse([{ _id: 'slot1', startsAt: slotStart }]);
      return jsonResponse({ _id: 'v1', status: 'pending' }, 201);
    });
    vi.stubGlobal('fetch', fetchMock);

    await openForm();

    expect(screen.queryByLabelText(/When would you like/)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('radio'));
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await screen.findByText(/Viewing requested!/);
    expect(JSON.parse(viewingCall()[1].body).startsAt).toBe(slotStart);
  });

  it('requires a slot to be chosen when slots are offered', async () => {
    fetchMock = vi.fn(async (url) => {
      if (url.startsWith('/api/availability/')) {
        return jsonResponse([{ _id: 'slot1', startsAt: new Date('2030-03-14T15:00:00Z').toISOString() }]);
      }
      return jsonResponse({ _id: 'v1' }, 201);
    });
    vi.stubGlobal('fetch', fetchMock);

    await openForm();
    await screen.findByRole('radio');
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(screen.getByText('Please choose one of the available times.')).toBeInTheDocument();
    expect(viewingCall()).toBeUndefined();
  });
});
