import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ResponseStats from './ResponseStats';
import { renderWithProviders } from '../test/utils';

const stub = (stats) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ stats })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('ResponseStats', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows how quickly and how often the owner replies', async () => {
    const fetchMock = stub({ conversations: 12, responseRate: 92, medianResponseMs: 7_200_000, responseTime: 'within 2 hours' });
    renderWithProviders(<ResponseStats ownerId='o1' />);

    expect(await screen.findByText(/Usually replies within 2 hours/)).toHaveTextContent('Usually replies within 2 hours · 92% response rate');
    expect(fetchMock).toHaveBeenCalledWith('/api/user/public/o1/response-stats', undefined);
  });

  it('is honest about owners who never reply', async () => {
    stub({ conversations: 3, responseRate: 0, medianResponseMs: null, responseTime: null });
    renderWithProviders(<ResponseStats ownerId='o1' />);

    expect(await screen.findByText(/Rarely replies/)).toHaveTextContent('Rarely replies · 0% response rate');
  });

  it('shows nothing without enough data', async () => {
    const fetchMock = stub(null);
    const { container } = renderWithProviders(<ResponseStats ownerId='o1' />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
