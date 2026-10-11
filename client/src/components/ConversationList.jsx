import { Link } from 'react-router-dom';
import { formatShortTime } from '../utils/formatTime';

const DEFAULT_AVATAR =
  'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

export default function ConversationList({ conversations, activeId, currentUserId }) {
  if (conversations.length === 0) {
    return (
      <p className='p-4 text-slate-600'>
        No messages yet. Use the &quot;Contact landlord&quot; button on a listing to start a conversation.
      </p>
    );
  }

  return (
    <ul className='divide-y'>
      {conversations.map((c) => {
        const unread = c.unreadCount > 0;
        const fromMe = c.lastMessage?.sender === currentUserId;
        return (
          <li key={c._id}>
            <Link
              to={`/messages/${c._id}`}
              aria-current={c._id === activeId ? 'page' : undefined}
              className={`flex gap-3 p-3 hover:bg-slate-100 ${c._id === activeId ? 'bg-slate-100' : ''}`}
            >
              <img
                src={c.otherUser?.avatar || DEFAULT_AVATAR}
                alt=''
                className='h-10 w-10 rounded-full object-cover shrink-0'
              />
              <div className='min-w-0 flex-1'>
                <div className='flex justify-between gap-2'>
                  <p className={`truncate ${unread ? 'font-bold' : 'font-semibold'} text-slate-700`}>
                    {c.otherUser?.username ?? 'Deleted user'}
                  </p>
                  {c.lastMessage?.createdAt && (
                    <span className='text-xs text-slate-500 shrink-0'>{formatShortTime(c.lastMessage.createdAt)}</span>
                  )}
                </div>
                <p className='text-xs text-slate-500 truncate'>
                  {c.listing ? c.listing.name : 'Listing removed'}
                </p>
                <div className='flex justify-between gap-2'>
                  <p className={`text-sm truncate ${unread ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                    {fromMe && 'You: '}
                    {c.lastMessage?.body}
                  </p>
                  {unread && (
                    <span className='rounded-full bg-red-600 text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0'>
                      {c.unreadCount}
                      <span className='sr-only'> unread</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
