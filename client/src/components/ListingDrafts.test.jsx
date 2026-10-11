import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingDrafts from './ListingDrafts';
import { renderWithProviders } from '../test/utils';

describe('ListingDrafts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists drafts with links to continue them', async () => {
    const fetchMock = vi.fn(async (url, options) =>
      new Response(
        JSON.stringify(
          options?.method === 'DELETE'
            ? 'deleted'
            : [
                { _id: 'd1', data: { name: 'Bright Loft' }, updatedAt: new Date().toISOString() },
                { _id: 'd2', data: {}, updatedAt: new Date().toISOString() },
              ]
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<ListingDrafts />);

    expect(await screen.findByText('Bright Loft')).toBeInTheDocument();
    expect(screen.getByText('Untitled listing')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Continue' })[0]).toHaveAttribute('href', '/create-listing?draft=d1');

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(fetchMock).toHaveBeenCalledWith('/api/listing-drafts/d1', { method: 'DELETE' });
  });

  it('renders nothing without drafts', async () => {
    const fetchMock = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderWithProviders(<ListingDrafts />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
