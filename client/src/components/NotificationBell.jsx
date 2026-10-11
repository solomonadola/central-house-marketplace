import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaCheckDouble } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import NotificationList from './NotificationList';
import { useNotificationActions, useNotificationPolling, useRefreshNotifications } from '../hooks/useNotifications';

const DROPDOWN_LIMIT = 8;

export default function NotificationBell() {
  const { currentUser } = useSelector((state) => state.user);
  const { items } = useSelector((state) => state.notifications);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);
  const { markRead, markAllRead, remove } = useNotificationActions();
  const refresh = useRefreshNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useNotificationPolling();

  useEffect(() => {
    if (!open) return undefined;
    refresh(DROPDOWN_LIMIT);

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, refresh]);

  if (!currentUser) return null;

  const latest = items.slice(0, DROPDOWN_LIMIT);

  return (
    <div className='relative' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        aria-haspopup='true'
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title='Notifications'
        className='relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      >
        <FaBell className='h-5 w-5' />
        {unreadCount > 0 && (
          <span className='absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className='absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg'>
          <div className='flex items-center justify-between border-b px-3 py-2'>
            <span className='text-sm font-semibold text-slate-700'>Notifications</span>
            {unreadCount > 0 && (
              <button
                type='button'
                onClick={markAllRead}
                className='flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline'
              >
                <FaCheckDouble className='h-3 w-3' aria-hidden='true' /> Mark all read
              </button>
            )}
          </div>
          <div className='max-h-96 overflow-y-auto'>
            <NotificationList
              notifications={latest}
              onOpen={(id) => {
                markRead(id);
                setOpen(false);
              }}
              onRemove={remove}
              emptyText='No notifications yet.'
            />
          </div>
          <Link
            to='/notifications'
            onClick={() => setOpen(false)}
            className='block border-t px-3 py-2 text-center text-sm font-medium text-brand-700 hover:bg-slate-50'
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
