import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useListingDraft } from './useListingDraft';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const wrapper =
  (route) =>
  // eslint-disable-next-line react/display-name -- test wrapper
  ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;

describe('useListingDraft', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url, options) => {
      if (options?.method === 'POST') return jsonResponse({ _id: 'd1', updatedAt: '2026-10-12T10:00:00Z', data: {} }, 201);
      if (options?.method === 'PUT') return jsonResponse({ _id: 'd1', updatedAt: '2026-10-12T11:00:00Z', data: {} });
      if (options?.method === 'DELETE') return jsonResponse('deleted');
      if (url === '/api/listing-drafts/d1') return jsonResponse({ _id: 'd1', updatedAt: '2026-10-12T09:00:00Z', data: { name: 'Saved Loft' } });
      return jsonResponse({ success: false, message: 'Draft not found!' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the draft named in the URL into the form', async () => {
    const onLoad = vi.fn();
    const { result } = renderHook(() => useListingDraft({}, onLoad), { wrapper: wrapper('/create-listing?draft=d1') });

    await waitFor(() => expect(onLoad).toHaveBeenCalledWith({ name: 'Saved Loft' }));
    expect(result.current.draftId).toBe('d1');
  });

  it('creates the draft on first save and updates it after', async () => {
    const { result } = renderHook(() => useListingDraft({ name: 'Loft' }, () => {}), { wrapper: wrapper('/create-listing') });

    await act(() => result.current.saveDraft());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/listing-drafts', expect.objectContaining({ method: 'POST' }));
    expect(result.current.draftId).toBe('d1');
    // Saving put the id in the URL, but the form isn't reloaded from it.
    expect(fetchMock).not.toHaveBeenCalledWith('/api/listing-drafts/d1', undefined);

    await act(() => result.current.saveDraft());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/listing-drafts/d1', expect.objectContaining({ method: 'PUT' }));
    expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body)).toEqual({ data: { name: 'Loft' } });
    expect(result.current.savedAt).toBe('2026-10-12T11:00:00Z');
  });

  it('discards the draft after publishing', async () => {
    const { result } = renderHook(() => useListingDraft({}, () => {}), { wrapper: wrapper('/create-listing?draft=d1') });
    await waitFor(() => expect(result.current.draftId).toBe('d1'));

    await act(() => result.current.discardDraft());

    expect(fetchMock).toHaveBeenCalledWith('/api/listing-drafts/d1', { method: 'DELETE' });
  });

  it('reports a draft that no longer exists', async () => {
    const { result } = renderHook(() => useListingDraft({}, () => {}), { wrapper: wrapper('/create-listing?draft=gone') });

    await waitFor(() => expect(result.current.error).toBe('That draft no longer exists.'));
    expect(result.current.draftId).toBeNull();
  });
});
