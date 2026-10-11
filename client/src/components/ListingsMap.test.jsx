import { describe, expect, it } from 'vitest';
import ListingsMap from './ListingsMap';
import { makeListing, renderWithProviders } from '../test/utils';

describe('ListingsMap', () => {
  it('renders a price marker for each listing with a location', () => {
    const { container } = renderWithProviders(
      <ListingsMap
        listings={[
          makeListing({ _id: 'a', regularPrice: 1500, location: { lat: 37.76, lng: -122.42 } }),
          makeListing({ _id: 'b', type: 'sale', regularPrice: 485000, location: { lat: 37.75, lng: -122.43 } }),
          makeListing({ _id: 'c', regularPrice: 999 }),
        ]}
      />
    );

    const markers = [...container.querySelectorAll('.listing-price-marker')].map((m) => m.textContent);
    expect(markers).toEqual(['$1,500', '$485k']);
  });

  it('renders nothing when no listing has a location', () => {
    const { container } = renderWithProviders(<ListingsMap listings={[makeListing()]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
