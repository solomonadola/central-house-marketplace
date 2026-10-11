import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyEmailBanner from './VerifyEmailBanner';
import { renderWithProviders } from '../test/utils';

describe('VerifyEmailBanner', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks unverified users to confirm and resends the link', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: 'We sent a new confirmation link.' })));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<VerifyEmailBanner />, {
      currentUser: { _id: 'u1', email: 'sarah@example.com', emailVerified: false },
    });

    expect(screen.getByText(/confirm your email address \(sarah@example.com\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resend confirmation link' }));

    expect(await screen.findByText('We sent a new confirmation link.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/resend-verification', { method: 'POST' });
  });

  it.each([
    ['verified users', { _id: 'u1', emailVerified: true }],
    ['users persisted before verification existed', { _id: 'u1' }],
    ['signed-out visitors', null],
  ])('is hidden for %s', (_, currentUser) => {
    const { container } = renderWithProviders(<VerifyEmailBanner />, { currentUser });
    expect(container).toBeEmptyDOMElement();
  });
});
