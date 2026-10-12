import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import {
  CHANGE_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  CONDITION_TONES,
  INSPECTION_STATUS,
  KIND_LABELS,
  conditionCounts,
} from '../utils/inspection';
import { formatLeaseDate } from '../utils/rent';

const send = async (url, method, body) => {
  const res = await apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.message);
  return data;
};

// The owner's editor: rooms, items with a condition and note, and a summary.
function ReportEditor({ inspection, busy, onSave, onSubmit }) {
  const [rooms, setRooms] = useState(inspection.rooms);
  const [summary, setSummary] = useState(inspection.summary);
  const [dirty, setDirty] = useState(false);

  const change = (updater) => {
    setRooms(updater);
    setDirty(true);
  };
  const setRoom = (r, fields) => change((all) => all.map((room, i) => (i === r ? { ...room, ...fields } : room)));
  const setItem = (r, n, fields) =>
    change((all) =>
      all.map((room, i) =>
        i === r ? { ...room, items: room.items.map((item, j) => (j === n ? { ...item, ...fields } : item)) } : room
      )
    );

  const save = () => onSave({ rooms, summary }).then((ok) => ok && setDirty(false));

  return (
    <div className='flex flex-col gap-4'>
      {rooms.map((room, r) => (
        <fieldset key={r} className='card p-4'>
          <div className='flex items-center gap-2'>
            <input
              value={room.name}
              onChange={(e) => setRoom(r, { name: e.target.value })}
              maxLength={60}
              aria-label={`Room ${r + 1} name`}
              className='input flex-1 font-semibold'
            />
            <button
              type='button'
              onClick={() => change((all) => all.filter((_, i) => i !== r))}
              className='btn-ghost text-red-700'
              aria-label={`Remove ${room.name || `room ${r + 1}`}`}
            >
              <FaTrash className='h-3 w-3' aria-hidden='true' />
            </button>
          </div>
          <ul className='mt-3 flex flex-col gap-2'>
            {room.items.map((item, n) => (
              <li key={n} className='grid gap-2 sm:grid-cols-[1fr_9rem_1.5fr_auto]'>
                <input
                  value={item.name}
                  onChange={(e) => setItem(r, n, { name: e.target.value })}
                  maxLength={60}
                  aria-label={`${room.name} item ${n + 1}`}
                  className='input py-1.5 text-sm'
                />
                <select
                  value={item.condition}
                  onChange={(e) => setItem(r, n, { condition: e.target.value })}
                  aria-label={`${room.name}: ${item.name} condition`}
                  className='input py-1.5 text-sm'
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input
                  value={item.note ?? ''}
                  onChange={(e) => setItem(r, n, { note: e.target.value })}
                  maxLength={300}
                  placeholder='Note'
                  aria-label={`${room.name}: ${item.name} note`}
                  className='input py-1.5 text-sm'
                />
                <button
                  type='button'
                  onClick={() => setRoom(r, { items: room.items.filter((_, j) => j !== n) })}
                  className='btn-ghost px-2 text-slate-500'
                  aria-label={`Remove ${item.name || 'item'} from ${room.name}`}
                >
                  <FaTrash className='h-3 w-3' aria-hidden='true' />
                </button>
              </li>
            ))}
          </ul>
          <button
            type='button'
            onClick={() => setRoom(r, { items: [...room.items, { name: '', condition: 'good', note: '' }] })}
            className='btn-ghost mt-2 text-sm'
          >
            <FaPlus className='h-3 w-3' aria-hidden='true' /> Add item
          </button>
        </fieldset>
      ))}

      <button type='button' onClick={() => change((all) => [...all, { name: '', items: [] }])} className='btn-secondary self-start'>
        <FaPlus className='h-3 w-3' aria-hidden='true' /> Add room
      </button>

      <label className='card flex flex-col gap-1 p-4'>
        <span className='label'>Summary</span>
        <textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            setDirty(true);
          }}
          rows={3}
          maxLength={2000}
          placeholder='e.g. Meter readings, number of keys handed over'
          className='input'
        />
      </label>

      <div className='flex flex-wrap gap-2'>
        <button type='button' disabled={busy || !dirty} onClick={save} className='btn-secondary'>
          {dirty ? 'Save draft' : 'Saved'}
        </button>
        <button
          type='button'
          disabled={busy}
          onClick={async () => {
            if (dirty && !(await onSave({ rooms, summary }))) return;
            setDirty(false);
            onSubmit();
          }}
          className='btn-primary'
        >
          Send to tenant
        </button>
      </div>
    </div>
  );
}

function ReportView({ rooms, summary }) {
  return (
    <div className='flex flex-col gap-4'>
      {rooms.map((room, r) => (
        <section key={r} className='card p-4' aria-label={room.name}>
          <h2 className='font-semibold text-slate-900'>{room.name}</h2>
          <ul className='mt-2 divide-y text-sm'>
            {room.items.map((item, n) => (
              <li key={n} className='flex flex-wrap justify-between gap-2 py-2'>
                <span className='text-slate-800'>{item.name}</span>
                <span className='text-right'>
                  <span className={`font-medium ${CONDITION_TONES[item.condition]}`}>{CONDITION_LABELS[item.condition]}</span>
                  {item.note && <span className='block text-xs text-slate-500'>{item.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {summary && <p className='card whitespace-pre-wrap p-4 text-sm text-slate-700'>{summary}</p>}
    </div>
  );
}

function Comparison({ comparison }) {
  const changed = comparison.rows.filter((r) => r.change === 'worse' || r.change === 'new');
  return (
    <section aria-labelledby='comparison-title' className='card p-4'>
      <h2 id='comparison-title' className='font-semibold text-slate-900'>
        Compared with move-in
      </h2>
      <p className='text-sm text-slate-600'>
        {comparison.totals.worse} worse · {comparison.totals.better} better · {comparison.totals.same} unchanged
        {comparison.totals.new > 0 && ` · ${comparison.totals.new} not in the move-in report`}
      </p>
      {changed.length > 0 && (
        <ul className='mt-2 divide-y text-sm'>
          {changed.map((row) => (
            <li key={`${row.room}-${row.item}`} className='flex flex-wrap justify-between gap-2 py-2'>
              <span>
                {row.room}: {row.item}
              </span>
              <span className={row.change === 'worse' ? 'font-medium text-red-700' : 'text-slate-600'}>
                {row.before ? `${CONDITION_LABELS[row.before]} → ` : ''}
                {CONDITION_LABELS[row.after]} ({CHANGE_LABELS[row.change]})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TenantAnswer({ busy, onSign, onDispute }) {
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState('');

  if (disputing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onDispute(reason);
        }}
        className='card flex flex-col gap-2 p-4'
      >
        <label htmlFor='dispute-reason' className='label'>
          What is wrong with the report?
        </label>
        <textarea id='dispute-reason' value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className='input' />
        <div className='flex gap-2'>
          <button disabled={busy || reason.trim().length < 10} className='btn-danger'>
            Send dispute
          </button>
          <button type='button' onClick={() => setDisputing(false)} className='btn-secondary'>
            Cancel
          </button>
        </div>
      </form>
    );
  }
  return (
    <div className='card flex flex-wrap items-center gap-3 p-4'>
      <p className='flex-1 text-sm text-slate-700'>Check every room. Signing confirms the report matches the home.</p>
      <button type='button' disabled={busy} onClick={onSign} className='btn-primary'>
        Sign report
      </button>
      <button type='button' disabled={busy} onClick={() => setDisputing(true)} className='btn-secondary'>
        Dispute
      </button>
    </div>
  );
}

export default function InspectionDetail() {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const url = `/api/inspections/${inspectionId}`;
  const { data, error, loading } = useFetchJson(url);
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (loading && !data) return <p className='container-page py-8 text-slate-600'>Loading...</p>;
  if (error) {
    return (
      <main className='container-page py-16 text-center'>
        <h1 className='page-title'>Report not found</h1>
        <Link to='/rent' className='btn-primary mt-6'>
          Back to rent
        </Link>
      </main>
    );
  }

  const { inspection, comparison, viewer } = latest ?? data;
  const isOwner = viewer.role === 'owner';
  const editable = isOwner && (inspection.status === 'draft' || inspection.status === 'disputed');
  const status = INSPECTION_STATUS[inspection.status];
  const counts = conditionCounts(inspection.rooms);

  // Runs an action; resolves true when it worked.
  const run = async (method, path, body) => {
    setBusy(true);
    setActionError(null);
    try {
      setLatest(await send(`${url}${path}`, method, body));
      return true;
    } catch (err) {
      setActionError(err.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className='container-page flex max-w-4xl flex-col gap-6 py-8'>
      <Link
        to={`/leases/${inspection.lease}`}
        className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'
      >
        <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> Back to lease
      </Link>

      <header className='card p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>{KIND_LABELS[inspection.kind]}</h1>
            <p className='text-sm text-slate-500'>
              {inspection.listing?.name ?? 'Listing removed'} · {isOwner ? 'Tenant' : 'Owner'}:{' '}
              {(isOwner ? inspection.tenant : inspection.owner)?.username ?? 'Deleted user'}
            </p>
          </div>
          <span className={`badge ring-1 ${status.tone}`}>{status.label}</span>
        </div>
        <p className='mt-3 text-sm text-slate-600'>
          {counts.good} good · {counts.fair} fair · {counts.poor} poor · {counts.damaged} damaged
          {inspection.signedAt && ` · Signed ${formatLeaseDate(inspection.signedAt)}`}
        </p>
        {inspection.status === 'disputed' && inspection.dispute && (
          <p className='mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
            <span className='font-semibold'>Tenant&apos;s dispute:</span> {inspection.dispute}
          </p>
        )}
      </header>

      {actionError && (
        <p className='text-sm text-red-700' role='alert'>
          {actionError}
        </p>
      )}

      {comparison && <Comparison comparison={comparison} />}

      {editable ? (
        <ReportEditor
          key={inspection.updatedAt}
          inspection={inspection}
          busy={busy}
          onSave={(body) => run('PATCH', '', body)}
          onSubmit={() => run('POST', '/submit')}
        />
      ) : (
        <ReportView rooms={inspection.rooms} summary={inspection.summary} />
      )}

      {isOwner && inspection.status === 'draft' && (
        <button
          type='button'
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await send(url, 'DELETE');
              navigate(`/leases/${inspection.lease}`);
            } catch (err) {
              setActionError(err.message || 'Could not delete the draft.');
              setBusy(false);
            }
          }}
          className='btn-ghost self-start text-sm text-red-700'
        >
          Delete draft
        </button>
      )}

      {viewer.role === 'tenant' && inspection.status === 'submitted' && (
        <TenantAnswer busy={busy} onSign={() => run('POST', '/sign')} onDispute={(reason) => run('POST', '/dispute', { reason })} />
      )}
    </main>
  );
}
