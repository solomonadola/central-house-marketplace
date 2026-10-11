import { useState } from 'react';
import { FaCalendarPlus, FaTrashAlt } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';

const DURATIONS = [
  ['30', '30 minutes'],
  ['60', '1 hour'],
  ['90', '1.5 hours'],
  ['120', '2 hours'],
];

const formatSlot = (date) =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function ListingAvailability({ listingId }) {
  const { data, error, loading, reload } = useFetchJson(`/api/availability/${listingId}`);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const slots = Array.isArray(data) ? data : [];

  const addSlot = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      setFormError('Pick a date and a start time.');
      return;
    }
    const startsAt = new Date(`${date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);

    setBusy(true);
    setFormError(null);
    try {
      const res = await apiFetch(`/api/availability/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: [{ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }] }),
      });
      const json = await res.json();
      if (json.success === false) {
        setFormError(json.message);
        return;
      }
      setDate('');
      setTime('');
      reload();
    } catch {
      setFormError('Could not add the slot. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeSlot = async (id) => {
    setBusy(true);
    try {
      await apiFetch(`/api/availability/slot/${id}`, { method: 'DELETE' });
      reload();
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/availability/${listingId}`, { method: 'DELETE' });
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='border-t border-slate-100 pt-4'>
      <h3 className='text-sm font-semibold text-slate-800'>Viewing availability</h3>
      <p className='mt-1 text-xs text-slate-500'>
        Add times you can show the property. Visitors will only be able to pick these.
      </p>

      <form onSubmit={addSlot} className='mt-3 flex flex-col gap-2'>
        <div className='flex flex-wrap gap-2'>
          <input
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label='Slot date'
            className='input flex-1'
          />
          <input
            type='time'
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label='Slot start time'
            className='input'
          />
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-label='Slot duration'
            className='input'
          >
            {DURATIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {formError && <p className='text-sm text-red-700'>{formError}</p>}
        <button type='submit' disabled={busy} className='btn-secondary'>
          <FaCalendarPlus aria-hidden='true' /> Add slot
        </button>
      </form>

      {loading && !data && <p className='mt-2 text-sm text-slate-500'>Loading slots...</p>}
      {error && <p className='mt-2 text-sm text-red-700'>{error}</p>}
      {!loading && !error && slots.length === 0 && (
        <p className='mt-2 text-sm text-slate-500'>No slots yet.</p>
      )}

      {slots.length > 0 && (
        <>
          <ul className='mt-3 flex flex-col gap-1'>
            {slots.map((slot) => (
              <li key={slot._id} className='flex items-center justify-between gap-2 text-sm'>
                <span className={slot.status === 'booked' ? 'text-slate-400' : 'text-slate-700'}>
                  {formatSlot(slot.startsAt)}
                  {slot.status === 'booked' && ' · booked'}
                </span>
                {slot.status !== 'booked' && (
                  <button
                    type='button'
                    onClick={() => removeSlot(slot._id)}
                    disabled={busy}
                    aria-label={`Remove slot ${formatSlot(slot.startsAt)}`}
                    className='text-slate-400 hover:text-red-600'
                  >
                    <FaTrashAlt className='h-3 w-3' aria-hidden='true' />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type='button' onClick={clearAll} disabled={busy} className='mt-2 text-xs text-slate-500 hover:text-red-700'>
            Clear open slots
          </button>
        </>
      )}
    </div>
  );
}
