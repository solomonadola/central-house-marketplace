import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickReplyPicker from './QuickReplyPicker';
import QuickRepliesManager from './QuickRepliesManager';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('quick replies', () => {
  let fetchMock;
  let replies;

  beforeEach(() => {
    replies = [
      { _id: 'q1', title: 'Viewing times', body: 'Weekday evenings work best.' },
      { _id: 'q2', title: 'Deposit', body: 'One month of rent.' },
    ];
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST' || options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return body.title === 'Bad' ? jsonResponse({ success: false, message: 'Name must be at most 40 characters' }, 400) : jsonResponse({ _id: 'q3', ...body }, 201);
      }
      if (options?.method === 'DELETE') return jsonResponse('deleted');
      return jsonResponse(replies);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('inserts a picked reply', async () => {
    const onPick = vi.fn();
    renderWithProviders(<QuickReplyPicker onPick={onPick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Quick replies' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Deposit/ }));

    expect(onPick).toHaveBeenCalledWith('One month of rent.');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('points to settings when there are no saved replies', async () => {
    replies = [];
    renderWithProviders(<QuickReplyPicker onPick={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Quick replies' }));

    expect(await screen.findByRole('link', { name: 'Add some' })).toHaveAttribute('href', '/settings#quick-replies');
  });

  it('adds, edits and deletes replies in settings', async () => {
    renderWithProviders(<QuickRepliesManager />);
    expect(await screen.findByText('Weekday evenings work best.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Reply name'), 'Pets');
    await userEvent.type(screen.getByLabelText('Reply text'), 'Cats are welcome.');
    await userEvent.click(screen.getByRole('button', { name: 'Add reply' }));
    const post = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ title: 'Pets', body: 'Cats are welcome.' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getAllByLabelText('Reply name')[0]).toHaveValue('Viewing times');

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url, o]) => url === '/api/quick-replies/q2' && o?.method === 'DELETE')).toBe(true)
    );
  });

  it('shows validation errors', async () => {
    renderWithProviders(<QuickRepliesManager />);
    await screen.findByText('Deposit');

    await userEvent.type(screen.getByLabelText('Reply name'), 'Bad');
    await userEvent.type(screen.getByLabelText('Reply text'), 'Text');
    await userEvent.click(screen.getByRole('button', { name: 'Add reply' }));

    expect(await screen.findByText('Name must be at most 40 characters')).toBeInTheDocument();
  });
});
