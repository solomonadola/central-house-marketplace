import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBolt } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';

// A small menu of the user's saved replies; picking one hands its text to
// onPick (e.g. to drop it into the message box).
export default function QuickReplyPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const { data } = useFetchJson('/api/quick-replies');
  const replies = Array.isArray(data) ? data : [];

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup='true'
        title='Quick replies'
        className='btn-ghost h-full px-2'
      >
        <FaBolt aria-hidden='true' />
        <span className='sr-only'>Quick replies</span>
      </button>
      {open && (
        <div className='card absolute bottom-full left-0 z-20 mb-2 w-72 p-2' role='menu'>
          {replies.length === 0 ? (
            <p className='p-2 text-sm text-slate-600'>
              No saved replies yet.{' '}
              <Link to='/settings#quick-replies' className='font-semibold text-brand-700'>
                Add some
              </Link>
            </p>
          ) : (
            <ul className='max-h-64 overflow-y-auto'>
              {replies.map((reply) => (
                <li key={reply._id}>
                  <button
                    type='button'
                    role='menuitem'
                    onClick={() => {
                      onPick(reply.body);
                      setOpen(false);
                    }}
                    className='w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100'
                  >
                    <span className='block text-sm font-semibold text-slate-800'>{reply.title}</span>
                    <span className='block truncate text-xs text-slate-500'>{reply.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
