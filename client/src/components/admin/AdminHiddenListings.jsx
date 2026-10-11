import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetchJson } from '../../hooks/useFetchJson';
import { apiFetch } from '../../utils/apiFetch';

export default function AdminHiddenListings() {
  const { data, error, loading, reload } = useFetchJson('/api/admin/listings/hidden');
  const [actionError, setActionError] = useState(null);

  const unhide = async (listingId) => {
    setActionError(null);
    const res = await apiFetch(`/api/admin/listings/${listingId}/unhide`, { method: 'POST' });
    const json = await res.json();
    if (json.success === false) {
      setActionError(json.message);
      return;
    }
    reload();
  };

  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;
  if (data.length === 0) return <p className='text-slate-600'>No hidden listings.</p>;

  return (
    <div className='flex flex-col gap-3'>
      {actionError && <p className='text-red-700'>{actionError}</p>}
      <ul className='flex flex-col gap-3'>
        {data.map((listing) => (
          <li key={listing._id} className='border rounded-lg p-3 bg-white flex flex-wrap items-center gap-3'>
            <div className='flex-1 min-w-[200px]'>
              <Link to={`/listing/${listing._id}`} className='font-semibold text-slate-700 hover:underline'>
                {listing.name}
              </Link>
              <p className='text-sm text-slate-600'>
                {listing.hiddenReason || 'No reason given'} · by {listing.ownerUsername ?? 'deleted user'}
              </p>
              {listing.hiddenBy === 'suspension' && (
                <p className='text-xs text-slate-500'>Hidden because the owner is suspended; reinstating them restores it.</p>
              )}
            </div>
            {listing.hiddenBy !== 'suspension' && (
              <button type='button' onClick={() => unhide(listing._id)} className='text-sm text-green-700 hover:underline'>
                Unhide
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
