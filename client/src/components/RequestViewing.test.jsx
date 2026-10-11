import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestViewing from './RequestViewing';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('RequestViewing', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({ _id: 'v1', status: 'pending' }, 201));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

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
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows errors from the server', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: 'You already have an upcoming viewing request for this listing.' }, 409)
    );
    await openForm();

    fireEvent.change(screen.getByLabelText(/When would you like/), { target: { value: '2030-03-14T15:30' } });
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText(/already have an upcoming viewing request/)).toBeInTheDocument();
  });
});
