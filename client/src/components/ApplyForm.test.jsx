import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplyForm from './ApplyForm';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('ApplyForm', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse({ _id: 'app1', status: 'submitted' }, 201));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const openForm = async () => {
    renderWithProviders(<ApplyForm listingId='l1' listingType='rent' />, {
      currentUser: { _id: 'me', email: 'me@example.com' },
    });
    await userEvent.click(screen.getByRole('button', { name: /Apply to rent/ }));
  };

  it('sends the application and confirms', async () => {
    await openForm();

    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Applicant');
    fireEvent.change(screen.getByLabelText('Occupants'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Annual income'), { target: { value: '90000' } });
    await userEvent.type(screen.getByLabelText('Message'), 'We are quiet tenants');
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));

    expect(await screen.findByText(/Application sent!/)).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      listingId: 'l1',
      fullName: 'Jane Applicant',
      email: 'me@example.com',
      occupants: '3',
      income: '90000',
      message: 'We are quiet tenants',
    });
    expect(screen.getByRole('link', { name: 'Track your applications' })).toHaveAttribute('href', '/applications');
  });

  it('prefills the email from the signed-in user', async () => {
    await openForm();
    expect(screen.getByLabelText('Email')).toHaveValue('me@example.com');
  });

  it('asks for a name first', async () => {
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));

    expect(screen.getByText('Please enter your full name.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('labels the button for a sale', async () => {
    renderWithProviders(<ApplyForm listingId='l1' listingType='sale' />, { currentUser: { _id: 'me' } });
    expect(screen.getByRole('button', { name: /Apply to buy/ })).toBeInTheDocument();
  });

  it('shows server errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: 'You already have an active application for this listing.' }, 409)
    );
    await openForm();
    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Applicant');
    await userEvent.click(screen.getByRole('button', { name: 'Send application' }));

    expect(await screen.findByText(/already have an active application/)).toBeInTheDocument();
  });
});
