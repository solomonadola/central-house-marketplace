import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import PriceComparison from './PriceComparison';
import { renderWithProviders } from '../test/utils';

const stub = (comparison) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ comparison })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('PriceComparison', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says how far below similar homes the price is', async () => {
    const fetchMock = stub({ comparables: 12, medianPrice: 2200, percentDifference: -18, nearbyOnly: true });
    renderWithProviders(<PriceComparison listingId='l1' />);

    expect(await screen.findByText('18% below similar homes nearby')).toBeInTheDocument();
    expect(screen.getByText(/Typical price \$2,200, from 12 homes/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/listing/l1/price-comparison', undefined);
  });

  it('describes higher and matching prices', async () => {
    stub({ comparables: 4, medianPrice: 2000, percentDifference: 10, nearbyOnly: false });
    const { unmount } = renderWithProviders(<PriceComparison listingId='l1' />);
    expect(await screen.findByText('10% above similar homes')).toBeInTheDocument();
    unmount();

    stub({ comparables: 4, medianPrice: 2000, percentDifference: 0, nearbyOnly: true });
    renderWithProviders(<PriceComparison listingId='l1' />);
    expect(await screen.findByText('In line with similar homes nearby')).toBeInTheDocument();
  });

  it('shows nothing without enough comparable homes', async () => {
    const fetchMock = stub(null);
    const { container } = renderWithProviders(<PriceComparison listingId='l1' />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
