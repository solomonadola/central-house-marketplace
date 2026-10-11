import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Payments from './Payments';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const payment = (overrides = {}) => ({
  _id: 'pay1',
  amount: 500,
  currency: 'USD',
  status: 'pending',
  reference: 'DEP-ABC123ABC123',
  listing: { _id: 'l1', name: 'Sunny Loft Apartment' },
  payer: { _id: 'me', username: 'me' },
  payee: { _id: 'u2', username: 'owner-jane' },
  createdAt: new Date().toISOString(),
  ...overrides,
});

const renderPayments = (route = '/payments', data = [payment()]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') return jsonResponse(data);
      if (url.endsWith('/refund')) return jsonResponse(payment({ status: 'refunded' }));
      return jsonResponse(payment({ status: 'paid' }));
    })
  );
  return renderWithProviders(
    <Routes>
      <Route path='/payments' element={<Payments />} />
    </Routes>,
    { route, currentUser: { _id: 'me' } }
  );
};

describe('Payments page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the deposits you paid with a confirm action', async () => {
    renderPayments();

    expect(await screen.findByText('$500')).toBeInTheDocument();
    expect(screen.getByText(/DEP-ABC123ABC123/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm payment' })).toBeInTheDocument();
  });

  it('confirms a pending deposit', async () => {
    renderPayments();
    await screen.findByText('$500');

    await userEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/pay1/confirm', { method: 'POST' });
    });
  });

  it('shows an empty state', async () => {
    renderPayments('/payments', []);
    expect(await screen.findByText(/have not paid any holding deposits/)).toBeInTheDocument();
  });

  it('offers a refund to the owner on a paid deposit', async () => {
    renderPayments('/payments?role=payee', [payment({ status: 'paid' })]);

    expect(await screen.findByText('Paid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refund deposit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/pay1/refund', { method: 'POST' });
    });
  });

  it('exports deposits to CSV', async () => {
    renderPayments();
    await screen.findByText('$500');
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }));

    await waitFor(() => {
      expect(global.fetch.mock.calls.some(([url]) => url === '/api/payments/export')).toBe(true);
    });
  });
});
