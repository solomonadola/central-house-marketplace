import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useParams } from 'react-router-dom';
import Contact from './Contact';
import { makeListing, renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ConversationPage = () => <p>Conversation {useParams().conversationId}</p>;

const renderContact = () =>
  renderWithProviders(
    <Routes>
      <Route path='/' element={<Contact listing={makeListing({ _id: 'l1', userRef: 'owner1' })} />} />
      <Route path='/messages/:conversationId' element={<ConversationPage />} />
    </Routes>,
    { currentUser: { _id: 'me' } }
  );

describe('Contact', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) =>
      url === '/api/user/owner1'
        ? jsonResponse({ _id: 'owner1', username: 'maria' })
        : jsonResponse({ conversationId: 'c9', message: {} }, 201)
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends an in-app message and opens the conversation', async () => {
    renderContact();

    await userEvent.type(await screen.findByLabelText(/Contact maria/), 'Is it still available?');
    await userEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText('Conversation c9')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'l1', body: 'Is it still available?' }),
    });
  });

  it('does not use email links', async () => {
    renderContact();
    await screen.findByLabelText(/Contact maria/);

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('shows the error when sending fails', async () => {
    fetchMock.mockImplementation(async (url) =>
      url === '/api/user/owner1'
        ? jsonResponse({ _id: 'owner1', username: 'maria' })
        : jsonResponse({ success: false, message: "You can't message yourself about your own listing!" }, 400)
    );
    renderContact();

    await userEvent.type(await screen.findByLabelText(/Contact maria/), 'Hi');
    await userEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByText("You can't message yourself about your own listing!")).toBeInTheDocument();
  });
});
