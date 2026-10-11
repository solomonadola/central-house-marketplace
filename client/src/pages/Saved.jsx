import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import ListingItem from '../components/ListingItem';
import { apiFetch } from '../utils/apiFetch';

export default function Saved() {
  const { currentUser } = useSelector((state) => state.user);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await apiFetch('/api/user/favorites');
        const data = await res.json();
        if (data.success === false) {
          setError(true);
          return;
        }
        setListings(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  // Hide listings as soon as they're unsaved on this page.
  const favorites = currentUser?.favorites ?? [];
  const visible = listings.filter((listing) => favorites.includes(listing._id));

  return (
    <main className='max-w-6xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-slate-700 my-7'>Saved listings</h1>
      {loading && <p className='text-xl text-slate-700'>Loading...</p>}
      {error && <p className='text-xl text-red-700'>Could not load your saved listings.</p>}
      {!loading && !error && visible.length === 0 && (
        <p className='text-slate-700'>
          You haven&apos;t saved any listings yet.{' '}
          <Link to='/search' className='text-blue-800 hover:underline'>
            Browse listings
          </Link>{' '}
          and tap the heart to save one.
        </p>
      )}
      <div className='flex flex-wrap gap-4'>
        {visible.map((listing) => (
          <ListingItem key={listing._id} listing={listing} />
        ))}
      </div>
    </main>
  );
}
