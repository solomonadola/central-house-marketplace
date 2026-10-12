import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaFileContract } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { formatMoney } from '../utils/paymentStatus';
import { formatLeaseDate, ordinal } from '../utils/rent';
import LeaseSetupForm from '../components/LeaseSetupForm';
import RentIncome from '../components/RentIncome';

function BalanceBadge({ lease }) {
  if (lease.status === 'ended') return <span className='badge bg-slate-100 text-slate-700 ring-1 ring-slate-200'>Ended</span>;
  const { balance, overdueCount } = lease.summary;
  if (overdueCount > 0) {
    return <span className='badge bg-red-50 text-red-800 ring-1 ring-red-200'>{formatMoney(balance, lease.currency)} overdue</span>;
  }
  if (balance > 0) {
    return <span className='badge bg-amber-50 text-amber-800 ring-1 ring-amber-200'>{formatMoney(balance, lease.currency)} due</span>;
  }
  return <span className='badge bg-green-50 text-green-800 ring-1 ring-green-200'>Up to date</span>;
}

function LeaseList({ asOwner }) {
  const { data, error, loading } = useFetchJson(`/api/leases${asOwner ? '?as=owner' : ''}`);

  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;
  if (data.length === 0) {
    return (
      <p className='card p-6 text-center text-slate-600'>
        {asOwner ? "You don't have any leases yet." : "You don't rent a home through Central House yet."}
      </p>
    );
  }

  return (
    <ul className='flex flex-col gap-3'>
      {data.map((lease) => {
        const other = asOwner ? lease.tenant : lease.owner;
        return (
          <li key={lease._id}>
            <Link to={`/leases/${lease._id}`} className='card flex flex-wrap items-center gap-3 p-4 hover:shadow-card-hover'>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-semibold text-slate-900'>{lease.listing?.name ?? 'Listing removed'}</p>
                <p className='mt-1 text-sm text-slate-500'>
                  {formatMoney(lease.monthlyRent, lease.currency)} / month, due on the {ordinal(lease.dueDay)} ·{' '}
                  {asOwner ? 'Tenant' : 'Owner'}: {other?.username ?? 'Deleted user'} · since {formatLeaseDate(lease.startDate)}
                </p>
              </div>
              <BalanceBadge lease={lease} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Approved rental applications the owner hasn't set up a lease for.
function Candidates() {
  const navigate = useNavigate();
  const { data } = useFetchJson('/api/leases/candidates');
  const [selected, setSelected] = useState(null);
  const candidates = Array.isArray(data) ? data : [];

  if (selected) {
    return (
      <LeaseSetupForm
        candidate={selected}
        onCancel={() => setSelected(null)}
        onCreated={(view) => navigate(`/leases/${view.lease._id}`)}
      />
    );
  }
  if (candidates.length === 0) return null;

  return (
    <section aria-labelledby='candidates-title' className='card p-5'>
      <h2 id='candidates-title' className='font-semibold text-slate-900'>
        Ready for a lease
      </h2>
      <p className='text-sm text-slate-600'>You approved these applications. Set up a lease to start tracking rent.</p>
      <ul className='mt-3 divide-y'>
        {candidates.map((c) => (
          <li key={c.applicationId} className='flex flex-wrap items-center justify-between gap-2 py-2'>
            <span className='text-sm text-slate-800'>
              <span className='font-medium'>{c.tenant?.username ?? 'Tenant'}</span> · {c.listing.name}
            </span>
            <button type='button' onClick={() => setSelected(c)} className='btn-secondary py-1.5 text-sm'>
              Set up lease
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Rent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOwner = searchParams.get('as') === 'owner';

  return (
    <main className='container-page flex flex-col gap-6 py-8'>
      <header>
        <h1 className='page-title flex items-center gap-3'>
          <FaFileContract className='text-brand-600' aria-hidden='true' /> Rent
        </h1>
        <p className='mt-2 text-slate-600'>Keep track of leases, what rent is due and what has been paid.</p>
      </header>

      <nav className='flex gap-2 border-b' role='tablist'>
        {[
          [false, 'Homes I rent'],
          [true, 'Homes I let'],
        ].map(([owner, label]) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={asOwner === owner}
            onClick={() => setSearchParams(owner ? { as: 'owner' } : {})}
            className={`-mb-px border-b-2 px-3 py-2 ${
              asOwner === owner ? 'border-slate-700 font-semibold text-slate-700' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {asOwner && <RentIncome />}
      {asOwner && <Candidates />}
      <LeaseList asOwner={asOwner} />
    </main>
  );
}
