import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaPlus, FaTools } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { formatShortTime } from '../utils/formatTime';
import { CATEGORY_LABELS, STATUS_LABELS } from '../utils/maintenance';
import MaintenanceStatusBadge from '../components/MaintenanceStatusBadge';
import ReportProblemForm from '../components/ReportProblemForm';

const STATUS_FILTERS = ['', 'open', 'in_progress', 'resolved', 'closed'];

function OwnerSummary() {
  const { data } = useFetchJson('/api/maintenance/summary');
  if (!data) return null;
  const waiting = data.open + data.in_progress;
  return (
    <p className='text-sm text-slate-600'>
      {waiting === 0 ? 'Nothing waiting on you.' : `${waiting} ${waiting === 1 ? 'request needs' : 'requests need'} attention`}
      {data.urgentOpen > 0 && <span className='badge ml-2 bg-red-50 text-red-700'>{data.urgentOpen} urgent</span>}
    </p>
  );
}

function RequestList({ asOwner, status }) {
  const params = new URLSearchParams();
  if (asOwner) params.set('as', 'owner');
  if (status) params.set('status', status);
  const { data, error, loading } = useFetchJson(`/api/maintenance?${params}`);

  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;
  if (data.length === 0) {
    return (
      <p className='card p-6 text-center text-slate-600'>
        {asOwner ? 'No maintenance requests for your properties.' : "You haven't reported any problems."}
      </p>
    );
  }

  return (
    <ul className='flex flex-col gap-3'>
      {data.map((r) => (
        <li key={r._id}>
          <Link to={`/maintenance/${r._id}`} className='card flex flex-wrap items-center gap-3 p-4 hover:shadow-card-hover'>
            <div className='min-w-0 flex-1'>
              <p className='flex items-center gap-2 font-semibold text-slate-900'>
                {r.urgency === 'urgent' && <span className='badge bg-red-600 text-white'>Urgent</span>}
                <span className='truncate'>{r.title}</span>
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                {CATEGORY_LABELS[r.category]} · {r.listing?.name ?? 'Listing removed'}
                {asOwner && r.tenant && ` · ${r.tenant.username}`} · updated {formatShortTime(r.updatedAt)}
              </p>
            </div>
            <MaintenanceStatusBadge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOwner = searchParams.get('as') === 'owner';
  const status = searchParams.get('status') ?? '';
  const [reporting, setReporting] = useState(false);
  const eligible = useFetchJson('/api/maintenance/eligible');
  const rentals = Array.isArray(eligible.data) ? eligible.data : [];

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <main className='container-page flex flex-col gap-6 py-8'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='page-title flex items-center gap-3'>
            <FaTools className='text-brand-600' aria-hidden='true' /> Maintenance
          </h1>
          <p className='mt-2 text-slate-600'>Report problems with a home you rent, or track repairs on your properties.</p>
        </div>
        {!asOwner && rentals.length > 0 && !reporting && (
          <button type='button' onClick={() => setReporting(true)} className='btn-primary'>
            <FaPlus className='h-3 w-3' aria-hidden='true' /> Report a problem
          </button>
        )}
      </header>

      {reporting && <ReportProblemForm listings={rentals} onCancel={() => setReporting(false)} />}

      <nav className='flex gap-2 border-b' role='tablist'>
        {[
          [false, 'My requests'],
          [true, 'On my properties'],
        ].map(([owner, label]) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={asOwner === owner}
            onClick={() => setParam('as', owner ? 'owner' : '')}
            className={`-mb-px border-b-2 px-3 py-2 ${
              asOwner === owner ? 'border-slate-700 font-semibold text-slate-700' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        {asOwner ? <OwnerSummary /> : <span />}
        <label className='flex items-center gap-2 text-sm'>
          Status
          <select value={status} onChange={(e) => setParam('status', e.target.value)} className='input w-auto py-1.5'>
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? STATUS_LABELS[s] : 'All'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!asOwner && eligible.data && rentals.length === 0 && (
        <p className='text-sm text-slate-500'>
          Once an owner approves your rental application, you can report problems with that home here.
        </p>
      )}

      <RequestList asOwner={asOwner} status={status} />
    </main>
  );
}
