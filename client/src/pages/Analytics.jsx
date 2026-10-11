import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import ViewsChart from '../components/ViewsChart';
import { downloadCsv } from '../utils/downloadCsv';

const compact = (n) => n.toLocaleString('en-US', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 });
const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

function StatTile({ label, value }) {
  return (
    <div className='border rounded-lg p-3 bg-white'>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className='text-2xl font-semibold text-slate-700'>{typeof value === 'number' ? compact(value) : value}</p>
    </div>
  );
}

export default function Analytics() {
  const { data, error, loading } = useFetchJson('/api/user/analytics');
  const [exportError, setExportError] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv('/api/user/analytics/export', 'analytics.csv');
    } catch {
      setExportError('Could not export your analytics.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className='max-w-4xl mx-auto p-3 flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-2 mt-5'>
        <h1 className='text-3xl font-semibold text-slate-700'>Analytics</h1>
        <button type='button' onClick={exportCsv} disabled={exporting} className='btn-secondary text-sm'>
          <FaDownload className='h-3 w-3' aria-hidden='true' /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
      {exportError && <p className='text-sm text-red-700'>{exportError}</p>}

      <section className='flex flex-col gap-4'>
        <div>
          <p className='text-sm text-slate-500'>Views in the last 30 days</p>
          <p className='text-5xl font-semibold text-slate-800'>{compact(totals.viewsLast30Days)}</p>
          <p className='mt-1 text-sm text-slate-500'>
            {Math.round(totals.enquiryRate * 100)}% of views become an enquiry
          </p>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <StatTile label='All-time views' value={totals.views} />
          <StatTile label='Saves' value={totals.saves} />
          <StatTile label='Enquiries' value={totals.enquiries} />
          <StatTile label='Viewing requests' value={totals.viewingRequests} />
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <StatTile label='Applications' value={totals.applications} />
          <StatTile label='Approved' value={totals.approvedApplications} />
          <StatTile label='Deposits paid' value={totals.depositsPaid} />
          <StatTile label='Deposits received' value={money(totals.depositsPaidAmount)} />
        </div>
        {totals.applications > 0 && (
          <p className='text-sm text-slate-500'>
            {Math.round(totals.approvalRate * 100)}% of applications are approved
          </p>
        )}
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
                <th className='py-2 px-3 font-normal text-right'>Applications</th>
                <th className='py-2 px-3 font-normal text-right'>Deposits</th>
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
                  <td className='py-2 px-3 text-right'>{l.applications}</td>
                  <td className='py-2 px-3 text-right'>{l.depositsPaid}</td>
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
