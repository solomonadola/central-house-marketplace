import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { formatShortTime } from '../utils/formatTime';
import { CATEGORY_LABELS, STATUS_ACTIONS, STATUS_LABELS, URGENCY_LABELS } from '../utils/maintenance';
import MaintenanceStatusBadge from '../components/MaintenanceStatusBadge';

function UpdateForm({ requestId, allowedStatuses, closed, onSaved }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const send = async (status) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/maintenance/${requestId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, ...(status && { status }) }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setBody('');
      onSaved(data);
    } catch {
      setError('Could not save your update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (closed && allowedStatuses.length === 0) {
    return <p className='text-sm text-slate-500'>This request is closed.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className='card flex flex-col gap-3 p-4'
    >
      <label htmlFor='maintenance-update' className='label'>
        Add an update
      </label>
      <textarea
        id='maintenance-update'
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder='e.g. Plumber booked for Monday morning'
        className='input'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex flex-wrap gap-2'>
        <button disabled={saving || !body.trim()} className='btn-secondary'>
          Post update
        </button>
        {allowedStatuses.map((status) => (
          <button key={status} type='button' disabled={saving} onClick={() => send(status)} className='btn-primary'>
            {STATUS_ACTIONS[status]}
          </button>
        ))}
      </div>
    </form>
  );
}

export default function MaintenanceDetail() {
  const { requestId } = useParams();
  const { data, error, loading, reload } = useFetchJson(`/api/maintenance/${requestId}`);
  const [latest, setLatest] = useState(null);

  if (loading && !data) return <p className='container-page py-8 text-slate-600'>Loading...</p>;
  if (error) {
    return (
      <main className='container-page py-16 text-center'>
        <h1 className='page-title'>Request not found</h1>
        <Link to='/maintenance' className='btn-primary mt-6'>
          Back to maintenance
        </Link>
      </main>
    );
  }

  const { request, viewer } = latest ?? data;
  const other = viewer.role === 'owner' ? request.tenant : request.owner;

  return (
    <main className='container-page flex max-w-3xl flex-col gap-6 py-8'>
      <Link
        to={viewer.role === 'owner' ? '/maintenance?as=owner' : '/maintenance'}
        className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'
      >
        <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> All requests
      </Link>

      <header className='card p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <h1 className='text-2xl font-bold text-slate-900'>{request.title}</h1>
          <MaintenanceStatusBadge status={request.status} />
        </div>
        <dl className='mt-4 grid gap-3 text-sm sm:grid-cols-4'>
          <div>
            <dt className='text-slate-500'>Home</dt>
            <dd className='font-medium text-slate-800'>
              {request.listing ? <Link to={`/listing/${request.listing._id}`}>{request.listing.name}</Link> : 'Listing removed'}
            </dd>
          </div>
          <div>
            <dt className='text-slate-500'>Category</dt>
            <dd className='font-medium text-slate-800'>{CATEGORY_LABELS[request.category]}</dd>
          </div>
          <div>
            <dt className='text-slate-500'>Urgency</dt>
            <dd className={`font-medium ${request.urgency === 'urgent' ? 'text-red-700' : 'text-slate-800'}`}>
              {URGENCY_LABELS[request.urgency]}
            </dd>
          </div>
          <div>
            <dt className='text-slate-500'>{viewer.role === 'owner' ? 'Tenant' : 'Owner'}</dt>
            <dd className='font-medium text-slate-800'>{other?.username ?? 'Deleted user'}</dd>
          </div>
        </dl>
        {request.description && <p className='mt-4 whitespace-pre-wrap text-slate-700'>{request.description}</p>}
        <p className='mt-3 text-xs text-slate-500'>Reported {formatShortTime(request.createdAt)}</p>
      </header>

      <section aria-labelledby='timeline-title'>
        <h2 id='timeline-title' className='mb-3 text-lg font-semibold text-slate-900'>
          Updates
        </h2>
        {request.updates.length === 0 && <p className='text-sm text-slate-600'>No updates yet.</p>}
        <ol className='flex flex-col gap-3 border-l-2 border-slate-200 pl-4'>
          {request.updates.map((u) => (
            <li key={u._id} className='relative'>
              <span className='absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500' aria-hidden='true' />
              <p className='text-sm text-slate-500'>
                <span className='font-semibold text-slate-800'>{u.author?.username ?? 'Deleted user'}</span> ·{' '}
                {formatShortTime(u.createdAt)}
                {u.status && <span className='ml-2'>marked it {STATUS_LABELS[u.status].toLowerCase()}</span>}
              </p>
              {u.body && <p className='mt-1 whitespace-pre-wrap text-slate-700'>{u.body}</p>}
            </li>
          ))}
        </ol>
      </section>

      <UpdateForm
        requestId={request._id}
        allowedStatuses={viewer.allowedStatuses}
        closed={request.status === 'closed'}
        onSaved={(fresh) => {
          setLatest(fresh);
          reload();
        }}
      />
    </main>
  );
}
