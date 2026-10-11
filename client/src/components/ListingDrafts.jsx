import { Link } from 'react-router-dom';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { formatShortTime } from '../utils/formatTime';

// The user's saved drafts, shown on the profile page when there are any.
export default function ListingDrafts() {
  const { data, reload } = useFetchJson('/api/listing-drafts');
  const drafts = Array.isArray(data) ? data : [];
  if (drafts.length === 0) return null;

  const remove = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    await apiFetch(`/api/listing-drafts/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <section className='card p-6' aria-labelledby='drafts-title'>
      <h2 id='drafts-title' className='text-lg font-semibold text-slate-900'>
        Drafts
      </h2>
      <ul className='mt-3 divide-y divide-slate-100'>
        {drafts.map((d) => (
          <li key={d._id} className='flex items-center gap-3 py-3'>
            <div className='min-w-0 flex-1'>
              <p className='truncate font-semibold text-slate-800'>{d.data?.name || 'Untitled listing'}</p>
              <p className='text-xs text-slate-500'>Saved {formatShortTime(d.updatedAt)}</p>
            </div>
            <Link to={`/create-listing?draft=${d._id}`} className='btn-secondary px-3 py-1.5 text-xs'>
              Continue
            </Link>
            <button type='button' onClick={() => remove(d._id)} className='btn-ghost px-3 py-1.5 text-xs text-red-700 hover:bg-red-50'>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
