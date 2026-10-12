import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';

// The signed-in user's block list, with an Unblock button for each person.
export default function BlockedUsers() {
  const { data, error, reload } = useFetchJson('/api/user/blocks');
  const users = Array.isArray(data) ? data : [];

  const unblock = async (id) => {
    await apiFetch(`/api/user/blocks/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <section aria-labelledby='blocked-title' className='mt-10'>
      <h2 id='blocked-title' className='text-lg font-semibold text-slate-900'>
        Blocked users
      </h2>
      <p className='mt-1 text-sm text-slate-600'>
        People you block can&apos;t message you, request viewings or ask questions on your listings.
      </p>
      {error && <p className='mt-3 text-sm text-red-700'>{error}</p>}
      {data && users.length === 0 && <p className='mt-3 text-sm text-slate-500'>You haven&apos;t blocked anyone.</p>}
      <ul className='card mt-3 divide-y divide-slate-100 empty:hidden'>
        {users.map((user) => (
          <li key={user._id} className='flex items-center gap-3 px-4 py-3'>
            <img src={user.avatar} alt='' className='h-8 w-8 rounded-full bg-slate-100 object-cover' />
            <span className='flex-1 font-medium text-slate-800'>{user.username}</span>
            <button type='button' onClick={() => unblock(user._id)} className='btn-secondary px-3 py-1.5 text-xs'>
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
