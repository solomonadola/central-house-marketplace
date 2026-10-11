import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import OwnerProfile from './OwnerProfile';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const profile = (overrides = {}) => ({
  user: { _id: 'u2', username: 'owner_maria', avatar: null, role: 'user', memberSince: '2025-01-15T00:00:00Z' },
  rating: { average: 4.5, count: 2 },
  listingCount: 1,
  listings: [makeListing({ _id: 'l1', name: 'Maria Loft Apartment' })],
  ...overrides,
});

const renderProfile = () =>
  renderWithProviders(
    <Routes>
      <Route path='/owner/:ownerId' element={<OwnerProfile />} />
    </Routes>,
    { route: '/owner/u2' }
  );

describe('OwnerProfile page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(profile())));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the owner, their rating and their listings', async () => {
    renderProfile();

    expect(await screen.findByText('owner_maria')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
    expect(screen.getByText('Maria Loft Apartment')).toBeInTheDocument();
  });

  it('handles an owner with no listings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(profile({ listingCount: 0, listings: [], rating: { average: 0, count: 0 } }))));
    renderProfile();

    expect(await screen.findByText(/no active listings right now/)).toBeInTheDocument();
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });

  it('shows a not-found state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false, message: 'User not found!' }, 404)));
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Owner not found' })).toBeInTheDocument();
  });
});
