import { useFetchJson } from '../../hooks/useFetchJson';

function StatCard({ label, value, detail, highlight = false }) {
  return (
    <div className={`border rounded-lg p-4 bg-white ${highlight ? 'border-red-300' : ''}`}>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className={`text-3xl font-semibold ${highlight ? 'text-red-700' : 'text-slate-700'}`}>{value}</p>
      {detail && <p className='text-xs text-slate-500 mt-1'>{detail}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const { data, error, loading } = useFetchJson('/api/admin/stats');

  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;

  const { users, listings, reports, reviews, messages } = data;

  return (
    <div className='grid gap-4 grid-cols-2 md:grid-cols-3'>
      <StatCard label='Open reports' value={reports.open} highlight={reports.open > 0} />
      <StatCard label='Users' value={users.total} detail={`${users.newThisWeek} new this week · ${users.suspended} suspended`} />
      <StatCard label='Listings' value={listings.total} detail={`${listings.newThisWeek} new this week · ${listings.hidden} hidden`} />
      <StatCard label='Conversations' value={messages.conversations} detail={`${messages.total} messages`} />
      <StatCard label='Reviews' value={reviews.total} />
    </div>
  );
}
