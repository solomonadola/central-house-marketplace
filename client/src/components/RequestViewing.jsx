import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarAlt } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';

// Value for a datetime-local input, in local time.
const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function RequestViewing({ listingId }) {
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [requested, setRequested] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!startsAt) {
      setError('Please choose a date and time.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/viewings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          // The input is in local time; send an exact instant plus the
          // zone so messages show the time the user picked.
          startsAt: new Date(startsAt).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          note,
        }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setRequested(true);
    } catch {
      setError('Could not send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (requested) {
    return (
      <p className='text-green-700'>
        Viewing requested! The owner will confirm it.{' '}
        <Link to='/viewings' className='text-blue-800 hover:underline'>
          See your viewings
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='btn-secondary'
      >
        <FaCalendarAlt aria-hidden='true' /> Request a viewing
      </button>
    );
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-2 rounded-lg bg-slate-50 p-3'>
      <label htmlFor='viewing-time' className='label'>
        When would you like to view it?
      </label>
      <input
        id='viewing-time'
        type='datetime-local'
        value={startsAt}
        min={toLocalInputValue(new Date())}
        onChange={(e) => setStartsAt(e.target.value)}
        className='input'
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder='Anything the owner should know? (optional)'
        aria-label='Note for the owner'
        className='input'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex gap-3'>
        <button
          type='submit'
          disabled={sending}
          className='btn-primary'
        >
          {sending ? 'Sending...' : 'Send request'}
        </button>
        <button type='button' onClick={() => setOpen(false)} className='btn-ghost'>
          Cancel
        </button>
      </div>
    </form>
  );
}
