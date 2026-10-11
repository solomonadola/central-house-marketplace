import { apiFetch } from './apiFetch';

const STORAGE_KEY = 'viewedListings';

const readViewed = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

// Counts a view at most once per listing per browser session, so
// refreshing the page doesn't inflate the count. Failures are ignored:
// a missed view isn't worth bothering the user about.
export const recordView = async (listingId) => {
  const viewed = readViewed();
  if (viewed.includes(listingId)) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...viewed, listingId]));
  } catch {
    // Storage can be unavailable (private mode); count the view anyway.
  }

  try {
    await apiFetch(`/api/listing/view/${listingId}`, { method: 'POST' });
  } catch {
    // Ignore network errors.
  }
};
