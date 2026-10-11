import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ListingItem from './ListingItem';
import { makeListing, renderWithProviders } from '../test/utils';

const renderItem = (overrides) => renderWithProviders(<ListingItem listing={makeListing(overrides)} />);

describe('ListingItem', () => {
  it('shows the listing details and links to the listing page', () => {
    renderItem();

    expect(screen.getByText('Bright Two-Bedroom Apartment')).toBeInTheDocument();
    expect(screen.getByText('1 Test Street')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/listing1');
    expect(screen.getByAltText('listing cover')).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows the monthly price for rentals', () => {
    renderItem({ regularPrice: 1500 });
    expect(screen.getByText(/\$1,500 \/ month/)).toBeInTheDocument();
  });

  it('shows the plain price for sales', () => {
    renderItem({ type: 'sale', regularPrice: 450000 });
    expect(screen.getByText('$450,000')).toBeInTheDocument();
  });

  it('shows the discounted price when there is an offer', () => {
    renderItem({ type: 'sale', regularPrice: 450000, offer: true, discountPrice: 425000 });
    expect(screen.getByText('$425,000')).toBeInTheDocument();
    expect(screen.queryByText('$450,000')).not.toBeInTheDocument();
  });

  it('uses singular and plural room labels', () => {
    renderItem({ bedrooms: 1, bathrooms: 2 });
    expect(screen.getByText('1 bed')).toBeInTheDocument();
    expect(screen.getByText('2 baths')).toBeInTheDocument();
  });

  it('falls back to a placeholder image', () => {
    renderItem({ imageUrls: [] });
    expect(screen.getByAltText('listing cover').getAttribute('src')).toMatch(/^https:\/\//);
  });
});
