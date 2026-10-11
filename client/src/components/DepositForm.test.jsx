import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DepositForm from './DepositForm';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const payment = (overrides = {}) => ({
  _id: 'pay1',
  amount: 500,
  currency: 'USD',
  status: 'pending',
  reference: 'DEP-ABC123ABC123',
  ...overrides,
});

describe('DepositForm', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'POST' && url === '/api/payments') return jsonResponse(payment(), 201);
      if (url.endsWith('/confirm')) return jsonResponse(payment({ status: 'paid' }));
      if (url.endsWith('/cancel')) return jsonResponse(payment({ status: 'cancelled' }));
      return jsonResponse({ success: false }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reserves the home and shows the reference', async () => {
    renderWithProviders(<DepositForm applicationId='app1' />, { currentUser: { _id: 'me' } });

    await userEvent.clear(screen.getByLabelText('Holding deposit'));
    await userEvent.type(screen.getByLabelText('Holding deposit'), '750');
    await userEvent.click(screen.getByRole('button', { name: /Reserve this home/ }));

    expect(await screen.findByText(/DEP-ABC123ABC123/)).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([url, o]) => url === '/api/payments' && o?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ applicationId: 'app1', amount: '750' });
  });

  it('confirms the payment', async () => {
    renderWithProviders(<DepositForm applicationId='app1' />, { currentUser: { _id: 'me' } });
    await userEvent.click(screen.getByRole('button', { name: /Reserve this home/ }));
    await screen.findByText(/DEP-ABC123ABC123/);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/payments/pay1/confirm', { method: 'POST' });
    });
    expect(await screen.findByText('Paid')).toBeInTheDocument();
  });

  it('shows server errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: 'You can pay a deposit once your application is approved.' }, 409)
    );
    renderWithProviders(<DepositForm applicationId='app1' />, { currentUser: { _id: 'me' } });

    await userEvent.click(screen.getByRole('button', { name: /Reserve this home/ }));

    expect(await screen.findByText(/once your application is approved/)).toBeInTheDocument();
  });
});
