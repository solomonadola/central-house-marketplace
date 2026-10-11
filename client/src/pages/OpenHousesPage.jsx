import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaDoorOpen, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { describeAttendance, formatOpenHouseTime } from '../utils/openHouseTime';

function OpenHouseCard({ openHouse }) {
  const { listing } = openHouse;
  return (
    <li>
      <Link
        to={`/listing/${listing._id}`}
        className='card flex gap-4 overflow-hidden p-3 transition-shadow hover:shadow-card-hover'
      >
        <img src={listing.imageUrls?.[0]} alt='' className='h-24 w-32 shrink-0 rounded-lg bg-slate-100 object-cover' />
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-brand-700'>{formatOpenHouseTime(openHouse.startsAt, openHouse.endsAt)}</p>
          <p className='mt-1 truncate font-semibold text-slate-900'>{listing.name}</p>
          <p className='mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500'>
            <FaMapMarkerAlt className='shrink-0 text-slate-400' aria-hidden='true' />
            {listing.address}
          </p>
          <p className='mt-1 flex items-center gap-1 text-xs text-slate-600'>
            <FaUsers aria-hidden='true' /> {describeAttendance(openHouse)}
            {openHouse.viewer?.rsvped && <span className='badge ml-2 bg-green-50 text-green-700'>You&apos;re going</span>}
          </p>
        </div>
      </Link>
    </li>
  );
}

function OpenHouseList({ url, empty }) {
  const { data, error, loading } = useFetchJson(url);
  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;
  if (data.length === 0) return <p className='text-slate-600'>{empty}</p>;
  return (
    <ul className='grid gap-3 md:grid-cols-2'>
      {data.map((openHouse) => (
        <OpenHouseCard key={openHouse._id} openHouse={openHouse} />
      ))}
    </ul>
  );
}

// Upcoming open houses across the site, plus the signed-in user's RSVPs.
export default function OpenHousesPage() {
  const { currentUser } = useSelector((state) => state.user);

  return (
    <main className='container-page flex flex-col gap-10 py-8'>
      <header>
        <h1 className='page-title flex items-center gap-3'>
          <FaDoorOpen className='text-brand-600' aria-hidden='true' /> Open houses
        </h1>
        <p className='mt-2 max-w-2xl text-slate-600'>
          Drop in and see a home in person. RSVP so the owner knows you&apos;re coming; you&apos;ll be told if
          anything changes.
        </p>
      </header>

      {currentUser && (
        <section aria-labelledby='my-rsvps-title'>
          <h2 id='my-rsvps-title' className='mb-3 text-xl font-semibold text-slate-900'>
            You&apos;re going to
          </h2>
          <OpenHouseList url='/api/open-houses/mine' empty="You haven't RSVPed to any open houses yet." />
        </section>
      )}

      <section aria-labelledby='upcoming-title'>
        <h2 id='upcoming-title' className='mb-3 text-xl font-semibold text-slate-900'>
          Coming up
        </h2>
        <OpenHouseList url='/api/open-houses/upcoming?limit=30' empty='No open houses are scheduled right now. Check back soon.' />
      </section>
    </main>
  );
}
