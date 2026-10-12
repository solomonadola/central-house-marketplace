import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlagContentButton from './FlagContentButton';
import { renderWithProviders } from '../test/utils';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('FlagContentButton', () => {
  let fetchMock;
  let reply;

  beforeEach(() => {
    reply = { flagged: true };
    fetchMock = vi.fn(async () => jsonResponse(reply));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends a flag with the chosen reason and thanks the user', async () => {
    renderWithProviders(<FlagContentButton targetType='review' targetId='r1' />);

    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'personal_info');
    await userEvent.type(screen.getByLabelText('Details'), 'Includes a phone number');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByText('Thanks, a moderator will take a look.')).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/content-flags');
    expect(JSON.parse(options.body)).toEqual({
      targetType: 'review',
      targetId: 'r1',
      reason: 'personal_info',
      details: 'Includes a phone number',
    });
  });

  it('shows why a flag was refused', async () => {
    reply = { success: false, message: 'You already flagged this review.' };
    renderWithProviders(<FlagContentButton targetType='review' targetId='r1' />);

    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You already flagged this review.');
    expect(screen.getByRole('form', { name: 'Report this review' })).toBeInTheDocument();
  });

  it('can be cancelled', async () => {
    renderWithProviders(<FlagContentButton targetType='question' targetId='q1' />);

    await userEvent.click(screen.getByRole('button', { name: 'Report' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
