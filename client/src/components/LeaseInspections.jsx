import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaClipboardCheck } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { INSPECTION_STATUS, KIND_LABELS } from '../utils/inspection';
import { formatLeaseDate } from '../utils/rent';

// The move-in and move-out reports on a lease. Owners can start the ones
// that don't exist yet.
export default function LeaseInspections({ leaseId, isOwner }) {
  const navigate = useNavigate();
  const { data, error } = useFetchJson(`/api/inspections?leaseId=${leaseId}`);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const inspections = Array.isArray(data) ? data : [];

  const start = async (kind) => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiFetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseId, kind }),
      });
      const body = await res.json();
      if (body.success === false) throw new Error(body.message);
      navigate(`/inspections/${body.inspection._id}`);
    } catch (err) {
      setCreateError(err.message || 'Could not start the report.');
      setCreating(false);
    }
  };

  const missing = ['move_in', 'move_out'].filter((kind) => !inspections.some((i) => i.kind === kind));

  return (
    <section aria-labelledby='inspections-title' className='card p-5'>
      <h2 id='inspections-title' className='flex items-center gap-2 text-lg font-semibold text-slate-900'>
        <FaClipboardCheck className='text-brand-600' aria-hidden='true' /> Inspection reports
      </h2>
      <p className='text-sm text-slate-600'>
        A room-by-room record of the home&apos;s condition, signed by the tenant at move-in and move-out.
      </p>

      {error && <p className='mt-3 text-sm text-red-700'>{error}</p>}
      {data && inspections.length === 0 && (
        <p className='mt-3 text-sm text-slate-500'>
          {isOwner ? 'No reports yet.' : "Your landlord hasn't sent you a report yet."}
        </p>
      )}

      {inspections.length > 0 && (
        <ul className='mt-3 divide-y'>
          {inspections.map((i) => {
            const status = INSPECTION_STATUS[i.status];
            return (
              <li key={i._id}>
                <Link to={`/inspections/${i._id}`} className='flex flex-wrap items-center justify-between gap-2 py-2 hover:text-brand-700'>
                  <span className='font-medium'>{KIND_LABELS[i.kind]}</span>
                  <span className='flex items-center gap-2 text-xs text-slate-500'>
                    {i.signedAt && `Signed ${formatLeaseDate(i.signedAt)}`}
                    <span className={`badge ring-1 ${status.tone}`}>{status.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {isOwner && data && missing.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {missing.map((kind) => (
            <button key={kind} type='button' disabled={creating} onClick={() => start(kind)} className='btn-secondary text-sm'>
              Start {KIND_LABELS[kind].toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {createError && (
        <p className='mt-2 text-sm text-red-700' role='alert'>
          {createError}
        </p>
      )}
    </section>
  );
}
