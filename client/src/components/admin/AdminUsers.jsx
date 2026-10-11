import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetchJson } from '../../hooks/useFetchJson';
import { apiFetch } from '../../utils/apiFetch';
import { formatShortTime } from '../../utils/formatTime';
import ReasonForm from './ReasonForm';

function UserRow({ user, onChanged }) {
  const [suspending, setSuspending] = useState(false);
  const [error, setError] = useState(null);

  const act = async (path, body) => {
    setError(null);
    const res = await apiFetch(`/api/admin/users/${user._id}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body && { body: JSON.stringify(body) }),
    });
    const data = await res.json();
    if (data.success === false) {
      setError(data.message);
      return;
    }
    setSuspending(false);
    onChanged();
  };

  return (
    <li className='border rounded-lg p-3 bg-white flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <Link to={`/admin/user/${user._id}`} className='font-semibold text-slate-700 hover:underline'>
          {user.username}
        </Link>
        <span className='text-sm text-slate-500'>{user.email}</span>
        {user.role === 'admin' && (
          <span className='rounded-full bg-slate-700 text-white text-xs px-2 py-0.5'>Admin</span>
        )}
        {user.suspended && (
          <span className='rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5'>Suspended</span>
        )}
        {!user.emailVerified && <span className='text-xs text-amber-700'>Email not confirmed</span>}
      </div>
      <p className='text-xs text-slate-500'>
        Joined {formatShortTime(user.createdAt)} · {user.listingCount}{' '}
        {user.listingCount === 1 ? 'listing' : 'listings'}
        {user.suspendedReason && ` · Suspended: ${user.suspendedReason}`}
      </p>
      {error && <p className='text-sm text-red-700'>{error}</p>}
      {user.role !== 'admin' &&
        (suspending ? (
          <ReasonForm
            label='Reason for suspending'
            confirmLabel='Suspend user'
            onConfirm={(reason) => act('suspend', { reason })}
            onCancel={() => setSuspending(false)}
          />
        ) : user.suspended ? (
          <button type='button' onClick={() => act('unsuspend')} className='self-start text-sm text-green-700 hover:underline'>
            Reinstate
          </button>
        ) : (
          <button
            type='button'
            onClick={() => setSuspending(true)}
            className='self-start text-sm text-red-700 font-semibold hover:underline'
          >
            Suspend
          </button>
        ))}
    </li>
  );
}

export default function AdminUsers() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [onlySuspended, setOnlySuspended] = useState(false);

  // Wait for the admin to pause typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (onlySuspended) params.set('suspended', 'true');
  const { data, error, loading, reload } = useFetchJson(`/api/admin/users?${params}`);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <input
          type='search'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Search by username or email'
          aria-label='Search users'
          className='border rounded-lg p-2 flex-1 min-w-[220px]'
        />
        <label className='flex items-center gap-2 text-sm'>
          <input type='checkbox' checked={onlySuspended} onChange={(e) => setOnlySuspended(e.target.checked)} />
          Suspended only
        </label>
      </div>
      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}
      {data && data.length === 0 && <p className='text-slate-600'>No users found.</p>}
      <ul className='flex flex-col gap-3'>
        {data?.map((user) => (
          <UserRow key={user._id} user={user} onChanged={reload} />
        ))}
      </ul>
    </div>
  );
}
