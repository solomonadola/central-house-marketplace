import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingReviews from './ListingReviews';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const now = new Date().toISOString();
const aliceReview = { _id: 'r1', rating: 5, comment: 'Great landlord!', author: { username: 'alice' }, createdAt: now };

describe('ListingReviews', () => {
  let fetchMock;
  let reviewsResponse;

  beforeEach(() => {
    reviewsResponse = { average: 5, count: 1, reviews: [aliceReview], viewer: null };
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse({ _id: 'r2' }, 201);
      if (options?.method === 'DELETE') return jsonResponse('Review has been deleted!');
      return jsonResponse(reviewsResponse);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the summary and reviews', async () => {
    renderWithProviders(<ListingReviews listingId='l1' />);

    expect(await screen.findByText('Great landlord!')).toBeInTheDocument();
    expect(screen.getByText(/5\.0 \(1 review\)/)).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.queryByText('Write a review')).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    reviewsResponse = { average: 0, count: 0, reviews: [], viewer: null };
    renderWithProviders(<ListingReviews listingId='l1' />);

    expect(await screen.findByText('No reviews yet.')).toBeInTheDocument();
  });

  it('lets eligible users post a review', async () => {
    reviewsResponse = { ...reviewsResponse, viewer: { canReview: true, isOwner: false, ownReview: null } };
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'me' } });

    await userEvent.click(await screen.findByRole('radio', { name: '4 stars' }));
    await userEvent.type(screen.getByLabelText('Review'), 'Quick to reply');
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/reviews/listing/l1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 4, comment: 'Quick to reply' }),
      })
    );
  });

  it('asks for a rating before posting', async () => {
    reviewsResponse = { ...reviewsResponse, viewer: { canReview: true, isOwner: false, ownReview: null } };
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'me' } });

    await userEvent.click(await screen.findByRole('button', { name: 'Post review' }));

    expect(screen.getByText('Please choose a rating.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(false);
  });

  it('pre-fills and lets users delete their own review', async () => {
    const own = { _id: 'r9', rating: 2, comment: 'Meh', author: { username: 'me' }, createdAt: now };
    reviewsResponse = { average: 2, count: 1, reviews: [own], viewer: { canReview: true, isOwner: false, ownReview: own } };
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Edit your review')).toBeInTheDocument();
    expect(screen.getByLabelText('Review')).toHaveValue('Meh');
    expect(screen.getByRole('radio', { name: '2 stars' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Delete your review' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews/r9', { method: 'DELETE' });
  });

  it('explains how to become eligible', async () => {
    reviewsResponse = { ...reviewsResponse, viewer: { canReview: false, isOwner: false, ownReview: null } };
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText(/after contacting its owner/)).toBeInTheDocument();
  });

  it('shows no prompt to the owner', async () => {
    reviewsResponse = { ...reviewsResponse, viewer: { canReview: false, isOwner: true, ownReview: null } };
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'owner' } });

    await screen.findByText('Great landlord!');
    expect(screen.queryByText(/after contacting its owner/)).not.toBeInTheDocument();
  });

  it('lets a signed-in user mark a review helpful', async () => {
    reviewsResponse = {
      ...reviewsResponse,
      reviews: [{ ...aliceReview, author: { _id: 'alice', username: 'alice' }, helpfulCount: 2, votedHelpful: false }],
      viewer: { canReview: false, isOwner: false, ownReview: null },
    };
    fetchMock.mockImplementation(async (url) => {
      if (String(url).endsWith('/helpful')) return jsonResponse({ helpfulCount: 3, voted: true });
      return jsonResponse(reviewsResponse);
    });
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'me' } });

    await userEvent.click(await screen.findByRole('button', { name: /Helpful \(2\)/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/reviews/r1/helpful', { method: 'POST' });
    });
    expect(await screen.findByRole('button', { name: /Helpful \(3\)/ })).toBeInTheDocument();
  });

  it('lets the owner reply to a review', async () => {
    reviewsResponse = {
      ...reviewsResponse,
      reviews: [{ ...aliceReview, author: { _id: 'alice', username: 'alice' }, helpfulCount: 0 }],
      viewer: { canReview: false, isOwner: true, ownReview: null },
    };
    fetchMock.mockImplementation(async (url, options) => {
      if (options?.method === 'PATCH') return jsonResponse({ _id: 'r1', ownerReply: 'Thanks!' });
      return jsonResponse(reviewsResponse);
    });
    renderWithProviders(<ListingReviews listingId='l1' />, { currentUser: { _id: 'owner' } });

    await userEvent.click(await screen.findByRole('button', { name: /Reply/ }));
    await userEvent.type(screen.getByLabelText('Reply to review'), 'Thanks!');
    await userEvent.click(screen.getByRole('button', { name: 'Post reply' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/reviews/r1/reply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Thanks!' }),
      });
    });
  });

  it('shows an existing owner reply', async () => {
    reviewsResponse = {
      ...reviewsResponse,
      reviews: [{ ...aliceReview, ownerReply: 'Glad you liked it' }],
      viewer: null,
    };
    renderWithProviders(<ListingReviews listingId='l1' />);

    expect(await screen.findByText(/Glad you liked it/)).toBeInTheDocument();
  });

  it('reloads with the chosen sort order', async () => {
    reviewsResponse = {
      average: 4,
      count: 2,
      reviews: [aliceReview, { ...aliceReview, _id: 'r2', comment: 'Second review' }],
      viewer: null,
    };
    renderWithProviders(<ListingReviews listingId='l1' />);
    await screen.findByText('Great landlord!');

    await userEvent.selectOptions(screen.getByLabelText('Sort reviews'), 'helpful');

    await waitFor(() => {
      expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/reviews/listing/l1?sort=helpful');
    });
  });
});
