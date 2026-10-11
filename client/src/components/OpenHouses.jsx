import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaDoorOpen, FaUsers } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { describeAttendance, formatOpenHouseTime, toLocalInputValue } from '../utils/openHouseTime';

function ScheduleForm({ listingId, onScheduled }) {
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!startsAt || !endsAt) {
      setError('Please choose a start and end time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/open-houses/listing/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          capacity: capacity === '' ? 0 : Number(capacity),
          note,
        }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setOpen(false);
      setStartsAt('');
      setEndsAt('');
      setCapacity('');
      setNote('');
      onScheduled();
    } catch {
      setError('Could not schedule the open house. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type='button' onClick={() => setOpen(true)} className='btn-secondary self-start'>
        <FaDoorOpen aria-hidden='true' /> Schedule an open house
      </button>
    );
  }

  const now = toLocalInputValue(new Date());

  return (
    <form onSubmit={submit} className='card grid gap-3 p-4 sm:grid-cols-2'>
      <div>
        <label htmlFor='open-house-start' className='label'>
          Starts
        </label>
        <input id='open-house-start' type='datetime-local' min={now} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className='input' />
      </div>
      <div>
        <label htmlFor='open-house-end' className='label'>
          Ends
        </label>
        <input id='open-house-end' type='datetime-local' min={startsAt || now} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className='input' />
      </div>
      <div>
        <label htmlFor='open-house-capacity' className='label'>
          Spaces (optional)
        </label>
        <input
          id='open-house-capacity'
          type='number'
          min='0'
          max='500'
          placeholder='No limit'
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className='input'
        />
      </div>
      <div>
        <label htmlFor='open-house-note' className='label'>
          Note for visitors (optional)
        </label>
        <input
          id='open-house-note'
          maxLength={300}
          placeholder='e.g. Ring the top bell'
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className='input'
        />
      </div>
      {error && <p className='text-sm text-red-700 sm:col-span-2'>{error}</p>}
      <div className='flex gap-2 sm:col-span-2'>
        <button disabled={saving} className='btn-primary'>
          {saving ? 'Scheduling...' : 'Schedule'}
        </button>
        <button type='button' onClick={() => setOpen(false)} className='btn-ghost'>
          Cancel
        </button>
      </div>
    </form>
  );
}

function OpenHouseRow({ openHouse, signedIn, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isOwner = openHouse.viewer?.isOwner;
  const rsvped = openHouse.viewer?.rsvped;

  const act = async (url, method) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(url, { method });
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

  return (
    <li className='card flex flex-col gap-2 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='font-semibold text-slate-900'>{formatOpenHouseTime(openHouse.startsAt, openHouse.endsAt)}</p>
        <span className={`badge ${openHouse.isFull ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
          <FaUsers aria-hidden='true' /> {describeAttendance(openHouse)}
        </span>
      </div>
      {openHouse.note && <p className='text-sm text-slate-600'>{openHouse.note}</p>}
      {isOwner && openHouse.attendees?.length > 0 && (
        <p className='text-sm text-slate-600'>Coming: {openHouse.attendees.map((a) => a.username).join(', ')}</p>
      )}
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex gap-2'>
        {isOwner && (
          <button
            type='button'
            disabled={busy}
            onClick={() => {
              if (window.confirm('Cancel this open house? Everyone who RSVPed will be told.')) {
                act(`/api/open-houses/${openHouse._id}/cancel`, 'POST');
              }
            }}
            className='btn-ghost px-3 py-1.5 text-xs text-red-700 hover:bg-red-50'
          >
            Cancel open house
          </button>
        )}
        {!isOwner && signedIn && rsvped && (
          <button type='button' disabled={busy} onClick={() => act(`/api/open-houses/${openHouse._id}/rsvp`, 'DELETE')} className='btn-secondary px-3 py-1.5 text-xs'>
            You&apos;re going · Cancel RSVP
          </button>
        )}
        {!isOwner && signedIn && !rsvped && (
          <button
            type='button'
            disabled={busy || openHouse.isFull}
            onClick={() => act(`/api/open-houses/${openHouse._id}/rsvp`, 'POST')}
            className='btn-primary px-3 py-1.5 text-xs'
          >
            {openHouse.isFull ? 'Full' : "I'll be there"}
          </button>
        )}
        {!signedIn && (
          <Link to='/sign-in' className='text-sm font-semibold text-brand-700'>
            Sign in to RSVP
          </Link>
        )}
      </div>
    </li>
  );
}

// Upcoming open houses for a listing; owners can schedule and cancel them.
export default function OpenHouses({ listingId, isOwner }) {
  const { currentUser } = useSelector((state) => state.user);
  const { data, reload } = useFetchJson(`/api/open-houses/listing/${listingId}`);
  const openHouses = Array.isArray(data) ? data : [];

  // Visitors only see the section when there's something to show.
  if (!isOwner && openHouses.length === 0) return null;

  return (
    <section aria-labelledby='open-houses-title' className='flex flex-col gap-3'>
      <h2 id='open-houses-title' className='text-xl font-semibold text-slate-900'>
        Open houses
      </h2>
      {isOwner && <ScheduleForm listingId={listingId} onScheduled={reload} />}
      {isOwner && data && openHouses.length === 0 && (
        <p className='text-sm text-slate-600'>No open houses scheduled. Visitors can RSVP to any you add.</p>
      )}
      <ul className='flex flex-col gap-3'>
        {openHouses.map((openHouse) => (
          <OpenHouseRow key={openHouse._id} openHouse={openHouse} signedIn={Boolean(currentUser)} onChanged={reload} />
        ))}
      </ul>
    </section>
  );
}
