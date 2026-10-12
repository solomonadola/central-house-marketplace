import { useState } from 'react';
import { FaFlag } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';
import { FLAG_REASONS } from '../utils/moderation';

// A small "Report" link under a review or question that opens a form to
// flag it for the moderators.
export default function FlagContentButton({ targetType, targetId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  if (status === 'sent') {
    return <span className='text-slate-500'>Thanks, a moderator will take a look.</span>;
  }

  if (!open) {
    return (
      <button type='button' onClick={() => setOpen(true)} className='flex items-center gap-1 text-slate-500 hover:underline'>
        <FaFlag aria-hidden='true' /> Report
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await apiFetch('/api/content-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      const data = await res.json();
      if (data.success === false) throw new Error(data.message);
      setStatus('sent');
    } catch (err) {
      setError(err.message || 'Could not send your report.');
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={submit} className='flex w-full flex-wrap items-center gap-2' aria-label={`Report this ${targetType}`}>
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label='Reason' className='input w-auto py-1 text-xs'>
        {Object.entries(FLAG_REASONS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        placeholder='Details (optional)'
        aria-label='Details'
        className='input min-w-[10rem] flex-1 py-1 text-xs'
      />
      <button disabled={status === 'sending'} className='btn-secondary px-3 py-1 text-xs'>
        Send report
      </button>
      <button type='button' onClick={() => setOpen(false)} className='text-slate-500 hover:underline'>
        Cancel
      </button>
      {error && (
        <span className='basis-full text-red-700' role='alert'>
          {error}
        </span>
      )}
    </form>
  );
}
