import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUnreadCount } from '../redux/inbox/inboxSlice';
import { apiFetch } from '../utils/apiFetch';

const POLL_MS = 30_000;

// Returns a function that reloads the unread conversation count into the
// store. Safe to call from anywhere, e.g. after opening a conversation.
export const useRefreshUnreadCount = () => {
  const dispatch = useDispatch();
  return useCallback(async () => {
    try {
      const res = await apiFetch('/api/messages/unread-count');
      const data = await res.json();
      if (typeof data.count === 'number') dispatch(setUnreadCount(data.count));
    } catch {
      // Keep the last known count; the next poll will retry.
    }
  }, [dispatch]);
};

// Keeps the unread count fresh while signed in: on mount, every 30s while
// the tab is visible, and when the tab regains focus.
export const useUnreadCountPolling = () => {
  const { currentUser } = useSelector((state) => state.user);
  const refresh = useRefreshUnreadCount();
  const signedIn = Boolean(currentUser);

  useEffect(() => {
    if (!signedIn) return undefined;

    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    window.addEventListener('focus', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [signedIn, refresh]);
};
