import { useState } from 'react';

// Inline "reason + confirm" form for moderation actions.
export default function ReasonForm({ label, confirmLabel, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className='flex flex-wrap gap-2 items-center'>
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        placeholder={label}
        aria-label={label}
        className='border rounded-lg p-2 text-sm flex-1 min-w-[200px]'
      />
      <button
        type='submit'
        disabled={busy || !reason.trim()}
        className='bg-red-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-60'
      >
        {confirmLabel}
      </button>
      <button type='button' onClick={onCancel} className='text-sm text-slate-600 hover:underline'>
        Cancel
      </button>
    </form>
  );
}
