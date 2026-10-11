import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordView } from './recordView';

describe('recordView', () => {
  let fetchMock;

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn().mockResolvedValue(new Response('{"views":1}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('records a view once per listing per session', async () => {
    await recordView('a');
    await recordView('a');
    await recordView('b');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/listing/view/a', { method: 'POST' });
    expect(fetchMock).toHaveBeenCalledWith('/api/listing/view/b', { method: 'POST' });
  });

  it('ignores network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(recordView('a')).resolves.toBeUndefined();
  });

  it('copes with corrupted storage', async () => {
    sessionStorage.setItem('viewedListings', '{not json');
    await recordView('a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
