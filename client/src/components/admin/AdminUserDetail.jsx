import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaEye, FaEyeSlash, FaPause } from 'react-icons/fa';
import { useFetchJson } from '../../hooks/useFetchJson';
import { formatShortTime } from '../../utils/formatTime';

const ACTION_LABELS = {
  hide_listing: 'Hid a listing',
  unhide_listing: 'Restored a listing',
  suspend_user: 'Suspended a user',
  unsuspend_user: 'Reinstated a user',
  resolve_report: 'Resolved a report',
  dismiss_report: 'Dismissed a report',
  reopen_report: 'Reopened a report',
};

function Stat({ label, value }) {
  return (
    <div className='border rounded-lg p-3 bg-white'>
      <p className='text-sm text-slate-500'>{label}</p>
      <p className='text-2xl font-semibold text-slate-700'>{value}</p>
    </div>
  );
}

export default function AdminUserDetail() {
  const { userId } = useParams();
  const { data, error, loading } = useFetchJson(`/api/admin/users/${userId}`);

  if (loading && !data) return <main className='max-w-5xl mx-auto p-3 text-slate-600'>Loading...</main>;
  if (error) return <main className='max-w-5xl mx-auto p-3 text-red-700'>{error}</main>;

  const { user, stats, listings, recentActions } = data;

  return (
    <main className='max-w-5xl mx-auto p-3'>
      <Link to='/admin?tab=users' className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'>
        <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> Back to users
      </Link>

      <header className='mt-4 flex flex-wrap items-center gap-4'>
        <img src={user.avatar} alt='' className='h-16 w-16 rounded-full object-cover' />
        <div>
          <h1 className='text-2xl font-semibold text-slate-800'>{user.username}</h1>
          <p className='text-sm text-slate-500'>{user.email}</p>
          <p className='mt-1 flex flex-wrap gap-2 text-xs'>
            {user.role === 'admin' && <span className='rounded-full bg-slate-700 text-white px-2 py-0.5'>Admin</span>}
            {user.suspended && (
              <span className='rounded-full bg-red-100 text-red-800 font-semibold px-2 py-0.5'>
                Suspended{user.suspendedReason ? `: ${user.suspendedReason}` : ''}
              </span>
            )}
            {!user.emailVerified && <span className='text-amber-700'>Email not confirmed</span>}
            <span className='text-slate-400'>Joined {formatShortTime(user.createdAt)}</span>
          </p>
        </div>
      </header>

      <section className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Stat label='Listings' value={stats.listings} />
        <Stat label='Hidden' value={stats.hidden} />
        <Stat label='Paused' value={stats.paused} />
        <Stat label='Open reports' value={stats.openReports} />
        <Stat label='Reviews written' value={stats.reviews} />
        <Stat label='Applications received' value={stats.applicationsReceived} />
        <Stat label='Deposits received' value={stats.depositsReceived} />
        <Stat label='Deposits value' value={`$${stats.depositsReceivedAmount.toLocaleString('en-US')}`} />
      </section>

      <section className='mt-8'>
        <h2 className='text-lg font-semibold text-slate-700'>Listings</h2>
        {listings.length === 0 ? (
          <p className='mt-2 text-slate-600'>No listings.</p>
        ) : (
          <ul className='mt-3 flex flex-col gap-2'>
            {listings.map((listing) => (
              <li key={listing._id} className='border rounded-lg p-3 bg-white flex flex-wrap items-center gap-3'>
                <Link to={`/listing/${listing._id}`} className='flex-1 font-medium text-slate-700 hover:underline'>
                  {listing.name}
                </Link>
                {listing.hidden && (
                  <span className='flex items-center gap-1 text-xs font-semibold text-red-700'>
                    <FaEyeSlash aria-hidden='true' /> Hidden
                  </span>
                )}
                {listing.active === false && (
                  <span className='flex items-center gap-1 text-xs font-semibold text-slate-500'>
                    <FaPause aria-hidden='true' /> Paused
                  </span>
                )}
                <span className='flex items-center gap-1 text-xs text-slate-500'>
                  <FaEye aria-hidden='true' /> {listing.views ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='mt-8'>
        <h2 className='text-lg font-semibold text-slate-700'>Recent admin actions</h2>
        {recentActions.length === 0 ? (
          <p className='mt-2 text-slate-600'>This user has not performed any admin actions.</p>
        ) : (
          <ul className='mt-3 flex flex-col gap-2 text-sm'>
            {recentActions.map((action) => (
              <li key={action._id} className='text-slate-600'>
                <span className='font-medium text-slate-700'>{ACTION_LABELS[action.action] ?? action.action}</span>
                {action.targetLabel && ` · ${action.targetLabel}`} · {formatShortTime(action.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
