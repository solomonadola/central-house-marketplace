import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFetchJson } from './useFetchJson';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe('useFetchJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads data and can reload', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ n: 1 })).mockResolvedValueOnce(jsonResponse({ n: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFetchJson('/api/x'));
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    expect(result.current.loading).toBe(false);

    await act(() => result.current.reload());
    expect(result.current.data).toEqual({ n: 2 });
  });

  it("reports the server's error message", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false, message: 'Admins only!' }, 403)));

    const { result } = renderHook(() => useFetchJson('/api/x'));

    await waitFor(() => expect(result.current.error).toBe('Admins only!'));
  });

  it('refetches when the URL changes', async () => {
    const fetchMock = vi.fn(async (url) => jsonResponse({ url }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(({ url }) => useFetchJson(url), { initialProps: { url: '/api/a' } });
    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/a' }));
    rerender({ url: '/api/b' });

    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/b' }));
  });
});
