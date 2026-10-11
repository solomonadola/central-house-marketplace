import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingQuestions from './ListingQuestions';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date().toISOString();

const answered = {
  _id: 'q1',
  question: 'Is there a dishwasher?',
  asker: { _id: 'u2', username: 'maria' },
  answer: { body: 'Yes, a new one.', answeredAt: now },
  createdAt: now,
};
const pending = { _id: 'q2', question: 'Are pets allowed?', asker: { _id: 'me', username: 'sarah' }, createdAt: now };

describe('ListingQuestions', () => {
  let fetchMock;
  let response;

  beforeEach(() => {
    response = { questions: [answered], viewer: null };
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse({ _id: 'new' }, 201);
      if (options?.method === 'DELETE') return jsonResponse('deleted');
      return jsonResponse(response);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const lastPost = () => fetchMock.mock.calls.filter(([, o]) => o?.method === 'POST').at(-1);

  it('shows answered questions and invites visitors to sign in', async () => {
    renderWithProviders(<ListingQuestions listingId='l1' />);

    expect(await screen.findByText('Is there a dishwasher?')).toBeInTheDocument();
    expect(screen.getByText('Yes, a new one.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByLabelText('Ask the owner a question')).not.toBeInTheDocument();
  });

  it('lets signed-in visitors ask a question', async () => {
    response = { questions: [], viewer: { isOwner: false, canAsk: true } };
    renderWithProviders(<ListingQuestions listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('No questions yet.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ask the owner a question'), 'Are pets allowed?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask question' }));

    expect(lastPost()[0]).toBe('/api/questions/listing/l1');
    expect(JSON.parse(lastPost()[1].body)).toEqual({ question: 'Are pets allowed?' });
    await waitFor(() => expect(screen.getByLabelText('Ask the owner a question')).toHaveValue(''));
  });

  it('shows an error from the server', async () => {
    response = { questions: [], viewer: { isOwner: false, canAsk: true } };
    fetchMock.mockImplementation(async (url, options) =>
      options?.method === 'POST'
        ? jsonResponse({ success: false, message: 'You already have 3 unanswered questions on this listing.' }, 429)
        : jsonResponse(response)
    );
    renderWithProviders(<ListingQuestions listingId='l1' />, { currentUser: { _id: 'me' } });

    await userEvent.type(await screen.findByLabelText('Ask the owner a question'), 'One more question?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask question' }));

    expect(await screen.findByText(/already have 3 unanswered questions/)).toBeInTheDocument();
  });

  it('lets askers withdraw their pending question', async () => {
    response = { questions: [pending], viewer: { isOwner: false, canAsk: true } };
    renderWithProviders(<ListingQuestions listingId='l1' />, { currentUser: { _id: 'me' } });

    expect(await screen.findByText('Awaiting answer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/questions/q2', { method: 'DELETE' });
  });

  it('lets the owner answer pending questions and edit answers', async () => {
    response = { questions: [pending, answered], viewer: { isOwner: true, canAsk: false } };
    renderWithProviders(<ListingQuestions listingId='l1' />, { currentUser: { _id: 'owner' } });

    await userEvent.type(await screen.findByLabelText('Answer to: Are pets allowed?'), 'Cats only.');
    await userEvent.click(screen.getByRole('button', { name: 'Post answer' }));
    expect(lastPost()[0]).toBe('/api/questions/q2/answer');
    expect(JSON.parse(lastPost()[1].body)).toEqual({ answer: 'Cats only.' });

    await userEvent.click(screen.getByRole('button', { name: 'Edit answer' }));
    expect(screen.getByLabelText('Answer to: Is there a dishwasher?')).toHaveValue('Yes, a new one.');
    expect(screen.queryByLabelText('Ask the owner a question')).not.toBeInTheDocument();
  });
});
