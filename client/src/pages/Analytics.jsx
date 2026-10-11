import { Link } from 'react-router-dom';
import { useFetchJson } from '../hooks/useFetchJson';
import ViewsChart from '../components/ViewsChart';

const compact = (n) => n.toLocaleString('en-US', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 });

function StatTile({ label, value }) {
  return (
    <div className='border rounded-lg p-3 bg-white'>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className='text-2xl font-semibold text-slate-700'>{compact(value)}</p>
    </div>
  );
}

export default function Analytics() {
  const { data, error, loading } = useFetchJson('/api/user/analytics');

  if (loading && !data) return <p className='p-3 text-center text-slate-600 mt-10'>Loading...</p>;
  if (error) return <p className='p-3 text-center text-red-700 mt-10'>{error}</p>;

  const { totals, viewsByDay, listings } = data;

  if (totals.listings === 0) {
    return (
      <main className='max-w-4xl mx-auto p-3'>
        <h1 className='text-3xl font-semibold text-slate-700 my-5'>Analytics</h1>
        <p className='text-slate-600'>
          You don&apos;t have any listings yet.{' '}
          <Link to='/create-listing' className='text-blue-800 hover:underline'>
            Create one
          </Link>{' '}
          to see how it performs.
        </p>
      </main>
    );
  }

  return (
    <main className='max-w-4xl mx-auto p-3 flex flex-col gap-6'>
      <h1 className='text-3xl font-semibold text-slate-700 mt-5'>Analytics</h1>

      <section className='flex flex-col gap-4'>
        <div>
          <p className='text-sm text-slate-500'>Views in the last 30 days</p>
          <p className='text-5xl font-semibold text-slate-800'>{compact(totals.viewsLast30Days)}</p>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <StatTile label='All-time views' value={totals.views} />
          <StatTile label='Saves' value={totals.saves} />
          <StatTile label='Enquiries' value={totals.enquiries} />
          <StatTile label='Viewing requests' value={totals.viewingRequests} />
        </div>
      </section>

      <section className='border rounded-lg p-4 bg-white'>
        <ViewsChart data={viewsByDay} />
      </section>

      <section className='flex flex-col gap-2'>
        <h2 className='text-xl font-semibold text-slate-700'>By listing</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm text-left'>
            <thead className='text-slate-500 border-b'>
              <tr>
                <th className='py-2 pr-3 font-normal'>Listing</th>
                <th className='py-2 px-3 font-normal text-right'>Views (30d)</th>
                <th className='py-2 px-3 font-normal text-right'>All-time</th>
                <th className='py-2 px-3 font-normal text-right'>Saves</th>
                <th className='py-2 px-3 font-normal text-right'>Enquiries</th>
                <th className='py-2 px-3 font-normal text-right'>Viewings</th>
                <th className='py-2 pl-3 font-normal text-right'>Rating</th>
              </tr>
            </thead>
            <tbody className='tabular-nums'>
              {listings.map((l) => (
                <tr key={l._id} className='border-b'>
                  <td className='py-2 pr-3'>
                    <Link to={`/listing/${l._id}`} className='text-slate-700 font-semibold hover:underline'>
                      {l.name}
                    </Link>
                    {l.hidden && <span className='ml-2 text-xs text-amber-700'>Hidden</span>}
                  </td>
                  <td className='py-2 px-3 text-right'>{l.viewsLast30Days.toLocaleString('en-US')}</td>
                  <td className='py-2 px-3 text-right'>{l.views.toLocaleString('en-US')}</td>
                  <td className='py-2 px-3 text-right'>{l.saves}</td>
                  <td className='py-2 px-3 text-right'>{l.enquiries}</td>
                  <td className='py-2 px-3 text-right'>{l.viewingRequests}</td>
                  <td className='py-2 pl-3 text-right'>
                    {l.ratingCount > 0 ? `${l.ratingAverage.toFixed(1)} (${l.ratingCount})` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
