import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RentIncome from './RentIncome';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const income = {
  months: [
    { period: '2026-08', expected: 1500, collected: 1500 },
    { period: '2026-09', expected: 3000, collected: 1500 },
    { period: '2026-10', expected: 3000, collected: 0 },
  ],
  totals: { activeLeases: 2, expected: 7500, collected: 3000, outstanding: 4500, overdue: 1500, overdueCount: 1 },
};

describe('RentIncome', () => {
  let fetchMock;
  let reply;

  beforeEach(() => {
    reply = income;
    fetchMock = vi.fn(async () => jsonResponse(reply));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows totals and a bar for each month', async () => {
    renderWithProviders(<RentIncome />);

    expect(await screen.findByText('$3,000')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('$4,500')).toBeInTheDocument();
    expect(screen.getByText('(1 months)')).toBeInTheDocument();
    const bars = within(screen.getByRole('list', { name: 'Rent by month' })).getAllByRole('listitem');
    expect(bars.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Aug: $1,500 of $1,500 collected',
      'Sep: $1,500 of $3,000 collected',
      'Oct: $0 of $3,000 collected',
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/leases/income?months=6', undefined);
  });

  it('changes the range', async () => {
    renderWithProviders(<RentIncome />);

    await userEvent.click(await screen.findByRole('button', { name: '12 months' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/leases/income?months=12', undefined);
    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows nothing for owners without leases', async () => {
    reply = { months: [], totals: { activeLeases: 0, expected: 0, collected: 0, outstanding: 0, overdue: 0, overdueCount: 0 } };
    const { container } = renderWithProviders(<RentIncome />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a load error', async () => {
    reply = { success: false, message: 'Could not load income.' };
    renderWithProviders(<RentIncome />);

    expect(await screen.findByText('Could not load income.')).toBeInTheDocument();
  });
});
