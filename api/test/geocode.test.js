import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeAddress } from '../utils/geocode.js';

const respond = (body, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('geocodeAddress', () => {
  // Geocoding is off for the test run as a whole; fetch is mocked here.
  beforeEach(() => vi.stubEnv('GEOCODING', 'on'));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns coordinates for the best match', async () => {
    const fetchMock = respond([{ lat: '51.5034', lon: '-0.1276' }]);
    vi.stubGlobal('fetch', fetchMock);

    expect(await geocodeAddress('10 Downing Street, London')).toEqual({ lat: 51.5034, lng: -0.1276 });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url.searchParams.get('q')).toBe('10 Downing Street, London');
    expect(options.headers['User-Agent']).toMatch(/CentralHouseMarketplace/);
  });

  it('returns null when nothing matches', async () => {
    vi.stubGlobal('fetch', respond([]));
    expect(await geocodeAddress('Nowhere at all')).toBeNull();
  });

  it('returns null on an error response', async () => {
    vi.stubGlobal('fetch', respond({ error: 'rate limited' }, 429));
    expect(await geocodeAddress('Somewhere')).toBeNull();
  });

  it('returns null when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await geocodeAddress('Somewhere')).toBeNull();
  });

  it('can be turned off', async () => {
    vi.stubEnv('GEOCODING', 'off');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await geocodeAddress('Somewhere')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses GEOCODER_URL when set', async () => {
    vi.stubEnv('GEOCODER_URL', 'http://localhost:8080/search');
    const fetchMock = respond([{ lat: '1', lon: '2' }]);
    vi.stubGlobal('fetch', fetchMock);

    await geocodeAddress('Somewhere');

    expect(fetchMock.mock.calls[0][0].origin).toBe('http://localhost:8080');
  });
});
