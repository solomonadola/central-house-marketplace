import { useState } from 'react';
import { FaFlag } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';

const REASONS = [
  ['scam', 'Looks like a scam'],
  ['inaccurate', 'Inaccurate details or photos'],
  ['unavailable', 'No longer available'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
];

export default function ReportListing({ listingId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, reason, details }),
      });
      const data = await res.json();
      // A duplicate report still means the listing is being looked at.
      if (data.success === false && data.statusCode !== 409) {
        setError(data.message);
        return;
      }
      setDone(true);
    } catch {
      setError('Could not send your report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return <p className='text-sm text-green-700'>Thanks for letting us know. Our team will review this listing.</p>;
  }

  if (!open) {
    return (
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='self-start flex items-center gap-1 text-sm text-slate-500 hover:text-red-700'
      >
        <FaFlag aria-hidden='true' /> Report listing
      </button>
    );
  }

  return (
    <form onSubmit={submit} className='card flex flex-col gap-3 p-4'>
      <fieldset className='flex flex-col gap-1'>
        <legend className='font-semibold text-slate-700 mb-1'>Why are you reporting this listing?</legend>
        {REASONS.map(([value, label]) => (
          <label key={value} className='flex items-center gap-2'>
            <input
              type='radio'
              name='reason'
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder='Anything else we should know? (optional)'
        aria-label='Report details'
        className='input'
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex gap-3'>
        <button
          type='submit'
          disabled={sending}
          className='btn-danger'
        >
          {sending ? 'Sending...' : 'Send report'}
        </button>
        <button type='button' onClick={() => setOpen(false)} className='btn-ghost'>
          Cancel
        </button>
      </div>
    </form>
  );
}
