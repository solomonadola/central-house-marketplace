import { useCallback, useState } from 'react';

const KEY = 'recentlyViewed';
export const MAX_RECENTLY_VIEWED = 12;

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

// Moves an id to the front of the recently-viewed list.
export const recordRecentlyViewed = (id) => {
  if (!id) return;
  try {
    const next = [id, ...read().filter((existing) => existing !== id)].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); viewing still works.
  }
};

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
};

// Reads the list into state so the page can update when it's cleared.
export const useRecentlyViewed = () => {
  const [ids, setIds] = useState(read);

  const clear = useCallback(() => {
    clearRecentlyViewed();
    setIds([]);
  }, []);

  return { ids, clear };
};
