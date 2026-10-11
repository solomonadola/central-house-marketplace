import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import PriceHistory from './PriceHistory';
import { renderWithProviders } from '../test/utils';

const stub = (body) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));

const history = [
  { _id: 'c3', price: 1600, previousPrice: 1800, createdAt: '2026-10-05T10:00:00Z' },
  { _id: 'c2', price: 1800, previousPrice: 1700, createdAt: '2026-09-20T10:00:00Z' },
  { _id: 'c1', price: 1700, previousPrice: null, createdAt: '2026-09-01T10:00:00Z' },
];

describe('PriceHistory', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists price changes with the direction and size of each', async () => {
    stub({ history, dropFromPeak: 11 });
    renderWithProviders(<PriceHistory listingId='l1' perMonth />);

    expect(await screen.findByRole('heading', { name: 'Price history' })).toBeInTheDocument();
    expect(screen.getByText('Down 11% from its highest price')).toBeInTheDocument();
    expect(screen.getByLabelText('Down 11%')).toBeInTheDocument();
    expect(screen.getByLabelText('Up 6%')).toBeInTheDocument();
    expect(screen.getByText('Listed')).toBeInTheDocument();
    expect(screen.getByText('$1,600 / month')).toBeInTheDocument();
  });

  it('stays hidden until the price has changed', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ history: [history[2]], dropFromPeak: 0 })));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderWithProviders(<PriceHistory listingId='l1' />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/listing/l1/price-history', undefined));
    expect(container).toBeEmptyDOMElement();
  });

  it('omits the drop badge when the price never fell', async () => {
    stub({ history: [{ ...history[1], previousPrice: 1700 }, history[2]], dropFromPeak: 0 });
    renderWithProviders(<PriceHistory listingId='l1' />);

    await screen.findByRole('heading', { name: 'Price history' });
    expect(screen.queryByText(/from its highest price/)).not.toBeInTheDocument();
  });
});
