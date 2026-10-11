import { Link } from 'react-router-dom';
import { FaHistory, FaTrashAlt } from 'react-icons/fa';
import ListingGrid from '../components/ListingGrid';
import { useFetchJson } from '../hooks/useFetchJson';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

export default function RecentlyViewed() {
  const { ids, clear } = useRecentlyViewed();
  const { data, error, loading } = useFetchJson(`/api/listing/by-ids?ids=${ids.join(',')}`);

  const listings = Array.isArray(data) ? data : [];

  return (
    <main className='container-page py-6 sm:py-8'>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <h1 className='page-title'>Recently viewed</h1>
        {ids.length > 0 && (
          <button type='button' onClick={clear} className='btn-ghost text-sm text-slate-600 hover:text-red-700'>
            <FaTrashAlt className='h-3.5 w-3.5' aria-hidden='true' /> Clear history
          </button>
        )}
      </div>

      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}

      {ids.length === 0 && (
        <div className='card flex flex-col items-center p-10 text-center'>
          <FaHistory className='h-8 w-8 text-slate-300' aria-hidden='true' />
          <p className='mt-3 text-slate-700'>You haven&apos;t viewed any homes yet.</p>
          <Link to='/search' className='btn-primary mt-4'>
            Browse homes
          </Link>
        </div>
      )}

      {ids.length > 0 && !loading && listings.length === 0 && !error && (
        <p className='text-slate-600'>Those homes are no longer available.</p>
      )}

      {listings.length > 0 && <ListingGrid listings={listings} columns='xl:grid-cols-3' />}
    </main>
  );
}
