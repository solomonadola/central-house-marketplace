// Turns an address into coordinates using an OpenStreetMap Nominatim
// server. Returns null when the address can't be found or the service is
// unavailable, so a listing can always be saved without a location.
//
// The public server allows about 1 request per second and requires an
// identifying User-Agent: https://operations.osmfoundation.org/policies/nominatim/
// Set GEOCODING=off to disable it, or GEOCODER_URL to use another server.
const DEFAULT_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'CentralHouseMarketplace/1.0 (+https://github.com/)';
const TIMEOUT_MS = 5000;

export const geocodeAddress = async (address) => {
  if (process.env.GEOCODING === 'off' || !address?.trim()) return null;

  const url = new URL(process.env.GEOCODER_URL || DEFAULT_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', address);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const [match] = await res.json();
    const lat = Number(match?.lat);
    const lng = Number(match?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (error) {
    console.error('Geocoding failed:', error.message);
    return null;
  }
};
