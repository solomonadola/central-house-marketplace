import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminContent from './AdminContent';
import { renderWithProviders } from '../../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date().toISOString();

const flaggedReview = {
  targetType: 'review',
  targetId: 'r1',
  text: 'Buy cheap pills at spam.example',
  rating: 1,
  author: { username: 'rude_reviewer' },
  listing: { _id: 'l1', name: 'Quiet Cottage' },
  flagCount: 3,
  reasons: { spam: 2, offensive: 1 },
  details: ['Advertising a website'],
  lastFlaggedAt: now,
};

const flaggedQuestion = {
  targetType: 'question',
  targetId: 'q1',
  text: 'Call me on 555-0100?',
  rating: null,
  author: null,
  listing: { _id: 'l1', name: 'Quiet Cottage' },
  flagCount: 1,
  reasons: { personal_info: 1 },
  details: [],
  lastFlaggedAt: now,
};

const removedItem = {
  targetType: 'review',
  targetId: 'r9',
  text: 'Old spam',
  author: { username: 'spammer' },
  removedReason: 'Spam link',
  removedAt: now,
};

describe('AdminContent', () => {
  let fetchMock;
  let flagged;
  let removed;
  let actionReply;

  beforeEach(() => {
    flagged = [flaggedReview, flaggedQuestion];
    removed = [removedItem];
    actionReply = { removed: true };
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse(actionReply);
      if (url.startsWith('/api/admin/content/removed')) return jsonResponse(removed);
      return jsonResponse(flagged);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows flagged content with its flags and reasons', async () => {
    renderWithProviders(<AdminContent />);

    const review = (await screen.findByText('Buy cheap pills at spam.example')).closest('li');
    expect(within(review).getByText('3 flags')).toBeInTheDocument();
    expect(within(review).getByText('1★')).toBeInTheDocument();
    expect(within(review).getByText('2 × Spam or advertising, 1 × Rude or offensive')).toBeInTheDocument();
    expect(within(review).getByText('Advertising a website')).toBeInTheDocument();
    expect(within(review).getByRole('link', { name: 'Quiet Cottage' })).toHaveAttribute('href', '/listing/l1');
    const question = screen.getByText('Call me on 555-0100?').closest('li');
    expect(within(question).getByText('1 flag')).toBeInTheDocument();
    expect(within(question).getByText(/by deleted user/)).toBeInTheDocument();
  });

  it('removes content with a reason and refreshes the lists', async () => {
    renderWithProviders(<AdminContent />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove review' }));
    flagged = [flaggedQuestion];
    await userEvent.type(screen.getByLabelText('Reason shown to the author'), 'Spam link');
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    const [url, options] = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toBe('/api/admin/content/review/r1/remove');
    expect(JSON.parse(options.body)).toEqual({ reason: 'Spam link' });
    expect(await screen.findByText('Call me on 555-0100?')).toBeInTheDocument();
    expect(screen.queryByText('Buy cheap pills at spam.example')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/content/removed?r=1', undefined);
  });

  it('dismisses flags and keeps the content', async () => {
    renderWithProviders(<AdminContent />);

    const question = (await screen.findByText('Call me on 555-0100?')).closest('li');
    await userEvent.click(within(question).getByRole('button', { name: 'Keep it and dismiss flags' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/content/question/q1/dismiss', expect.objectContaining({ method: 'POST' }));
  });

  it('restores removed content', async () => {
    renderWithProviders(<AdminContent />);

    const item = (await screen.findByText('Old spam')).closest('li');
    expect(within(item).getByText(/Spam link/)).toBeInTheDocument();
    removed = [];
    await userEvent.click(within(item).getByRole('button', { name: 'Restore' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/content/review/r9/restore', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => expect(screen.queryByText('Old spam')).not.toBeInTheDocument());
  });

  it('shows errors from actions', async () => {
    actionReply = { success: false, message: 'There are no open flags on this content.' };
    renderWithProviders(<AdminContent />);

    await userEvent.click((await screen.findAllByRole('button', { name: 'Keep it and dismiss flags' }))[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('There are no open flags on this content.');
  });

  it('says when nothing is flagged', async () => {
    flagged = [];
    removed = [];
    renderWithProviders(<AdminContent />);

    expect(await screen.findByText('Nothing flagged right now.')).toBeInTheDocument();
    expect(screen.queryByText('Recently removed')).not.toBeInTheDocument();
  });
});
