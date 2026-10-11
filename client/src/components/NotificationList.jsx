import { Link } from 'react-router-dom';
import { FaTrashAlt } from 'react-icons/fa';
import { formatShortTime } from '../utils/formatTime';
import { notificationIcon } from '../utils/notificationIcons';

function Row({ notification }) {
  const { Icon, tone } = notificationIcon(notification.type);
  return (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className='h-4 w-4' aria-hidden='true' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex items-start justify-between gap-2'>
          <span className={`text-sm ${notification.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
            {notification.title}
          </span>
          <span className='shrink-0 text-xs text-slate-500'>{formatShortTime(notification.createdAt)}</span>
        </span>
        {notification.body && <span className='mt-0.5 block text-xs text-slate-500'>{notification.body}</span>}
      </span>
      {!notification.read && <span className='mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600' aria-label='Unread' />}
    </>
  );
}

export default function NotificationList({ notifications, onOpen, onRemove, emptyText = 'No notifications yet.' }) {
  if (notifications.length === 0) {
    return <p className='p-6 text-center text-slate-600'>{emptyText}</p>;
  }

  const rowClass =
    'flex items-center gap-3 p-3 text-left hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100';

  return (
    <ul className='divide-y'>
      {notifications.map((n) => (
        <li key={n._id} className={`relative ${n.read ? 'bg-white' : 'bg-brand-50/40'}`}>
          {n.link ? (
            <Link to={n.link} onClick={() => onOpen?.(n._id)} className={rowClass}>
              <Row notification={n} />
            </Link>
          ) : (
            <button type='button' onClick={() => onOpen?.(n._id)} className={`w-full ${rowClass}`}>
              <Row notification={n} />
            </button>
          )}
          {onRemove && (
            <button
              type='button'
              onClick={() => onRemove(n._id)}
              aria-label={`Remove notification: ${n.title}`}
              className='absolute right-1 bottom-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600'
            >
              <FaTrashAlt className='h-3 w-3' aria-hidden='true' />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
