import { Link } from 'react-router-dom';
import { FaChartBar } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { propertyTypeLabel } from '../utils/listingDetails';

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;
const percent = (n) => `${Math.round((n ?? 0) * 100)}%`;

function Stat({ label, value }) {
  return (
    <div className='card p-4'>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className='text-2xl font-semibold text-slate-800'>{value}</p>
    </div>
  );
}

function PriceCard({ title, stats }) {
  if (!stats) return null;
  return (
    <div className='card flex flex-col gap-2 p-5'>
      <h3 className='font-semibold text-slate-800'>{title}</h3>
      <p className='text-2xl font-bold text-slate-900'>{money(stats.average)}</p>
      <dl className='grid grid-cols-2 gap-2 text-sm text-slate-600'>
        <div>
          <dt className='text-slate-500'>Lowest</dt>
          <dd className='font-medium text-slate-800'>{money(stats.min)}</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Highest</dt>
          <dd className='font-medium text-slate-800'>{money(stats.max)}</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Avg. bedrooms</dt>
          <dd className='font-medium text-slate-800'>{stats.averageBedrooms}</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Avg. bathrooms</dt>
          <dd className='font-medium text-slate-800'>{stats.averageBathrooms}</dd>
        </div>
        <div className='col-span-2'>
          <dt className='text-slate-500'>Furnished</dt>
          <dd className='font-medium text-slate-800'>{percent(stats.furnishedShare)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function Insights() {
  const { data, error, loading } = useFetchJson('/api/insights');

  if (loading && !data) return <main className='container-page py-16 text-center text-slate-600'>Loading insights...</main>;
  if (error) return <main className='container-page py-16 text-center text-red-700'>{error}</main>;

  const { total, newThisWeek, forRent, forSale, prices, byPropertyType } = data;
  const maxCount = Math.max(1, ...byPropertyType.map((row) => row.count));

  return (
    <main className='container-page py-6 sm:py-8'>
      <div className='flex items-center gap-3'>
        <FaChartBar className='h-6 w-6 text-brand-600' aria-hidden='true' />
        <h1 className='page-title'>Market insights</h1>
      </div>
      <p className='mt-1 text-sm text-slate-600'>A snapshot of homes currently listed on Central House.</p>

      <section className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Stat label='Homes listed' value={total} />
        <Stat label='New this week' value={newThisWeek} />
        <Stat label='For rent' value={forRent} />
        <Stat label='For sale' value={forSale} />
      </section>

      <section className='mt-8'>
        <h2 className='text-xl font-semibold text-slate-900'>Average prices</h2>
        <div className='mt-3 grid gap-4 sm:grid-cols-2'>
          <PriceCard title='Rentals (per month)' stats={prices.rent} />
          <PriceCard title='Sales' stats={prices.sale} />
        </div>
      </section>

      <section className='mt-8'>
        <h2 className='text-xl font-semibold text-slate-900'>By property type</h2>
        {byPropertyType.length === 0 ? (
          <p className='mt-3 text-slate-600'>No listings yet.</p>
        ) : (
          <ul className='mt-4 flex flex-col gap-3'>
            {byPropertyType.map((row) => (
              <li key={row.propertyType}>
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-slate-700'>{propertyTypeLabel(row.propertyType)}</span>
                  <span className='text-slate-500'>
                    {row.count} {row.count === 1 ? 'home' : 'homes'} · avg {money(row.averagePrice)}
                  </span>
                </div>
                <div className='mt-1 h-2 rounded-full bg-slate-100'>
                  <div
                    className='h-2 rounded-full bg-brand-500'
                    style={{ width: `${Math.round((row.count / maxCount) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className='mt-8 text-sm text-slate-500'>
        Want to add your home?{' '}
        <Link to='/create-listing' className='font-medium text-brand-700 hover:underline'>
          Post a listing
        </Link>
        .
      </p>
    </main>
  );
}
