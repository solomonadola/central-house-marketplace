import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { downloadCsv } from '../utils/downloadCsv';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

const formatWhen = (date) =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function ViewingCard({ viewing, asOwner, onChanged }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const other = asOwner ? viewing.requester : viewing.owner;
  const upcoming = new Date(viewing.startsAt) > new Date();

  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/viewings/${viewing._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const canRespond = asOwner && viewing.status === 'pending' && upcoming;
  const canCancel = ['pending', 'accepted'].includes(viewing.status) && upcoming;

  return (
    <li className='border rounded-lg p-3 bg-white flex flex-col gap-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-semibold text-slate-700'>{formatWhen(viewing.startsAt)}</span>
        <span className={`rounded-full text-xs font-semibold px-2 py-0.5 capitalize ${STATUS_STYLES[viewing.status]}`}>
          {viewing.status}
        </span>
      </div>
      <p className='text-sm text-slate-600'>
        {viewing.listing ? (
          <Link to={`/listing/${viewing.listing._id}`} className='text-blue-800 hover:underline'>
            {viewing.listing.name}
          </Link>
        ) : (
          'Listing removed'
        )}{' '}
        · {asOwner ? 'requested by' : 'with'} {other?.username ?? 'deleted user'}
      </p>
      {viewing.note && <p className='text-sm text-slate-700'>&ldquo;{viewing.note}&rdquo;</p>}
      {viewing.responseNote && <p className='text-sm text-slate-500'>Reply: {viewing.responseNote}</p>}
      {error && <p className='text-sm text-red-700'>{error}</p>}
      {(canRespond || canCancel) && (
        <div className='flex gap-3 text-sm mt-1'>
          {canRespond && (
            <>
              <button type='button' disabled={busy} onClick={() => act('accept')} className='text-green-700 font-semibold hover:underline'>
                Accept
              </button>
              <button type='button' disabled={busy} onClick={() => act('decline')} className='text-red-700 hover:underline'>
                Decline
              </button>
            </>
          )}
          {canCancel && !canRespond && (
            <button type='button' disabled={busy} onClick={() => act('cancel')} className='text-slate-600 hover:underline'>
              Cancel viewing
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Viewings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOwner = searchParams.get('as') === 'owner';
  const { data, error, loading, reload } = useFetchJson(`/api/viewings${asOwner ? '?as=owner' : ''}`);
  const [exporting, setExporting] = useState(false);

  const exportCalendar = async () => {
    setExporting(true);
    try {
      await downloadCsv(`/api/viewings/export${asOwner ? '?as=owner' : ''}`, 'viewings.ics');
    } finally {
      setExporting(false);
    }
  };

  const now = new Date();
  const upcoming = (data ?? []).filter((v) => new Date(v.startsAt) > now).reverse();
  const past = (data ?? []).filter((v) => new Date(v.startsAt) <= now);

  const section = (title, viewings) =>
    viewings.length > 0 && (
      <section className='flex flex-col gap-3'>
        <h2 className='text-lg font-semibold text-slate-700'>{title}</h2>
        <ul className='flex flex-col gap-3'>
          {viewings.map((v) => (
            <ViewingCard key={v._id} viewing={v} asOwner={asOwner} onChanged={reload} />
          ))}
        </ul>
      </section>
    );

  return (
    <main className='max-w-3xl mx-auto p-3 flex flex-col gap-5'>
      <h1 className='text-3xl font-semibold text-slate-700 mt-5'>Viewings</h1>
      <button type='button' onClick={exportCalendar} disabled={exporting} className='btn-secondary self-start text-sm'>
        <FaDownload className='h-3 w-3' aria-hidden='true' /> {exporting ? 'Exporting...' : 'Add to calendar'}
      </button>
      <nav className='flex gap-2 border-b' role='tablist'>
        {[
          [false, 'My requests'],
          [true, 'On my listings'],
        ].map(([owner, label]) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={asOwner === owner}
            onClick={() => setSearchParams(owner ? { as: 'owner' } : {})}
            className={`px-3 py-2 -mb-px border-b-2 ${
              asOwner === owner ? 'border-slate-700 text-slate-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}
      {data && data.length === 0 && (
        <p className='text-slate-600'>
          {asOwner
            ? 'Nobody has requested a viewing of your listings yet.'
            : "You haven't requested any viewings. Use \"Request a viewing\" on a listing."}
        </p>
      )}
      {section('Upcoming', upcoming)}
      {section('Past', past)}
    </main>
  );
}
