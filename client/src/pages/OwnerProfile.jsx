import { Link, useParams } from 'react-router-dom';
import { FaCalendarAlt, FaStar } from 'react-icons/fa';
import ListingGrid from '../components/ListingGrid';
import { useFetchJson } from '../hooks/useFetchJson';

const DEFAULT_AVATAR =
  'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

export default function OwnerProfile() {
  const { ownerId } = useParams();
  const { data, error, loading } = useFetchJson(`/api/user/public/${ownerId}`);

  if (loading && !data) {
    return <main className='container-page py-16 text-center text-slate-600'>Loading profile...</main>;
  }

  if (error) {
    return (
      <main className='container-page py-16 text-center'>
        <h1 className='page-title'>Owner not found</h1>
        <p className='mt-2 text-slate-600'>This profile may have been removed.</p>
        <Link to='/search' className='btn-primary mt-6'>
          Browse homes
        </Link>
      </main>
    );
  }

  const { user, rating, listingCount, listings } = data;
  const joined = new Date(user.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main className='container-page py-6 sm:py-8'>
      <header className='card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center'>
        <img src={user.avatar || DEFAULT_AVATAR} alt='' className='h-20 w-20 rounded-full object-cover' />
        <div className='flex-1'>
          <h1 className='text-2xl font-bold text-slate-900'>{user.username}</h1>
          <p className='mt-1 flex items-center gap-2 text-sm text-slate-500'>
            <FaCalendarAlt aria-hidden='true' /> Member since {joined}
          </p>
          <div className='mt-2 flex flex-wrap items-center gap-4 text-sm'>
            <span className='flex items-center gap-1.5 text-slate-700'>
              <FaStar className='text-amber-500' aria-hidden='true' />
              {rating.count > 0 ? (
                <>
                  <span className='font-semibold'>{rating.average.toFixed(1)}</span>
                  <span className='text-slate-400'>({rating.count} reviews)</span>
                </>
              ) : (
                <span className='text-slate-500'>No reviews yet</span>
              )}
            </span>
            <span className='text-slate-500'>
              {listingCount} {listingCount === 1 ? 'listing' : 'listings'}
            </span>
          </div>
        </div>
      </header>

      <section className='mt-8' aria-labelledby='owner-listings-title'>
        <h2 id='owner-listings-title' className='text-xl font-semibold text-slate-900'>
          Listings by {user.username}
        </h2>
        {listings.length === 0 ? (
          <p className='mt-3 text-slate-600'>This owner has no active listings right now.</p>
        ) : (
          <div className='mt-4'>
            <ListingGrid listings={listings} columns='xl:grid-cols-3' />
          </div>
        )}
      </section>
    </main>
  );
}
