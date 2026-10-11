import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiFetch';
import { store } from '../redux/store';
import { signInSuccess, signOutUserSuccess } from '../redux/user/userSlice';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiFetch', () => {
  beforeEach(() => {
    store.dispatch(signInSuccess({ _id: 'u1', username: 'sarah' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    store.dispatch(signOutUserSuccess());
  });

  it('passes the request through and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiFetch('/api/listing/get', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('/api/listing/get', { method: 'GET' });
    expect(await res.json()).toEqual({ ok: true });
    expect(store.getState().user.currentUser).not.toBeNull();
  });

  it('signs the user out when the session is no longer valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { success: false, code: 'AUTH_REQUIRED' }))
    );

    const res = await apiFetch('/api/user/listings/u1');

    expect(store.getState().user.currentUser).toBeNull();
    // The caller can still read the body.
    expect((await res.json()).code).toBe('AUTH_REQUIRED');
  });

  it('keeps the user signed in on other 401s', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(401, { success: false, message: 'You can only delete your own listings!' })
      )
    );

    await apiFetch('/api/listing/delete/x', { method: 'DELETE' });

    expect(store.getState().user.currentUser).not.toBeNull();
  });

  it('copes with a non-JSON 401 body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));

    await expect(apiFetch('/api/x')).resolves.toBeInstanceOf(Response);
    expect(store.getState().user.currentUser).not.toBeNull();
  });
});
