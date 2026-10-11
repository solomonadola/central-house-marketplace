import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
  setNotifications,
  setUnreadNotifications,
} from '../redux/notifications/notificationSlice';
import { apiFetch } from '../utils/apiFetch';

const POLL_MS = 30_000;

// Loads the latest page of notifications into the store.
export const useRefreshNotifications = () => {
  const dispatch = useDispatch();
  return useCallback(
    async (limit = 30) => {
      try {
        const res = await apiFetch(`/api/notifications?limit=${limit}`);
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          dispatch(setNotifications(data.notifications));
          if (typeof data.unreadCount === 'number') dispatch(setUnreadNotifications(data.unreadCount));
        }
      } catch {
        // Keep whatever we already have; the next refresh will retry.
      }
    },
    [dispatch]
  );
};

const useRefreshUnreadCount = () => {
  const dispatch = useDispatch();
  return useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications/unread-count');
      const data = await res.json();
      if (typeof data.count === 'number') dispatch(setUnreadNotifications(data.count));
    } catch {
      // Ignore; the next poll retries.
    }
  }, [dispatch]);
};

// Keeps the unread badge fresh while signed in.
export const useNotificationPolling = () => {
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

// Mutations for the bell dropdown and the notifications page. Each updates
// the store optimistically and rolls back by refreshing on failure.
export const useNotificationActions = () => {
  const dispatch = useDispatch();
  const refresh = useRefreshNotifications();

  const markRead = useCallback(
    async (id) => {
      dispatch(markNotificationRead(id));
      try {
        await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      } catch {
        refresh();
      }
    },
    [dispatch, refresh]
  );

  const markAllRead = useCallback(async () => {
    dispatch(markAllNotificationsRead());
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      refresh();
    }
  }, [dispatch, refresh]);

  const remove = useCallback(
    async (id) => {
      dispatch(removeNotification(id));
      try {
        await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch {
        refresh();
      }
    },
    [dispatch, refresh]
  );

  const clearAll = useCallback(async () => {
    dispatch(setNotifications([]));
    dispatch(setUnreadNotifications(0));
    try {
      await apiFetch('/api/notifications', { method: 'DELETE' });
    } catch {
      refresh();
    }
  }, [dispatch, refresh]);

  return { markRead, markAllRead, remove, clearAll };
};
