import { useEffect, useState } from 'react';
import { FaCheckDouble, FaTrashAlt } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import NotificationList from '../components/NotificationList';
import { useNotificationActions, useRefreshNotifications } from '../hooks/useNotifications';

export default function Notifications() {
  const { items } = useSelector((state) => state.notifications);
  const { markRead, markAllRead, remove, clearAll } = useNotificationActions();
  const refresh = useRefreshNotifications();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    refresh(100);
  }, [refresh]);

  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <main className='container-page max-w-3xl py-6 sm:py-8'>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <h1 className='page-title'>Notifications</h1>
        <div className='flex items-center gap-3 text-sm'>
          {unreadCount > 0 && (
            <button
              type='button'
              onClick={markAllRead}
              className='flex items-center gap-1 font-medium text-brand-700 hover:underline'
            >
              <FaCheckDouble className='h-3.5 w-3.5' aria-hidden='true' /> Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              type='button'
              onClick={clearAll}
              className='flex items-center gap-1 text-slate-600 hover:text-red-700 hover:underline'
            >
              <FaTrashAlt className='h-3.5 w-3.5' aria-hidden='true' /> Clear all
            </button>
          )}
        </div>
      </div>

      <div className='mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-56'>
        {[
          ['all', 'All'],
          ['unread', 'Unread'],
        ].map(([value, label]) => (
          <button
            key={value}
            type='button'
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
            {value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className='card overflow-hidden'>
        <NotificationList
          notifications={shown}
          onOpen={markRead}
          onRemove={remove}
          emptyText={filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
        />
      </div>
    </main>
  );
}
