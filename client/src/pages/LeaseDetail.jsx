import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { downloadCsv } from '../utils/downloadCsv';
import { formatMoney } from '../utils/paymentStatus';
import {
  METHOD_LABELS,
  RECORDABLE_METHODS,
  chargeStateInfo,
  formatLeaseDate,
  ordinal,
  periodLabel,
  toDateInput,
} from '../utils/rent';

const postJson = async (url, body = {}) => {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.message);
  return data;
};

function SummaryCards({ summary, currency }) {
  const cards = [
    ['Balance', formatMoney(summary.balance, currency), summary.overdueCount > 0 ? 'text-red-700' : 'text-slate-900'],
    ['Paid so far', formatMoney(summary.paid, currency), 'text-green-700'],
    [
      'Next payment',
      summary.nextDue ? `${formatMoney(summary.nextDue.amount, currency)} · ${periodLabel(summary.nextDue.period)}` : 'Nothing due',
      'text-slate-900',
    ],
  ];
  return (
    <dl className='grid gap-3 sm:grid-cols-3'>
      {cards.map(([label, value, tone]) => (
        <div key={label} className='card p-4'>
          <dt className='text-sm text-slate-500'>{label}</dt>
          <dd className={`mt-1 text-lg font-semibold ${tone}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The owner's controls for one unpaid month: record an offline payment or
// waive it.
function OwnerChargeActions({ charge, busy, onAction }) {
  const [mode, setMode] = useState(null);
  const [method, setMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');

  if (!mode) {
    return (
      <div className='flex flex-wrap gap-2'>
        <button type='button' disabled={busy} onClick={() => setMode('record')} className='btn-secondary px-3 py-1 text-xs'>
          Record payment
        </button>
        <button type='button' disabled={busy} onClick={() => setMode('waive')} className='btn-ghost px-3 py-1 text-xs'>
          Waive
        </button>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    onAction(mode, charge, mode === 'record' ? { method, note } : { note });
  };

  return (
    <form onSubmit={submit} className='flex flex-wrap items-center gap-2' aria-label={`${mode === 'record' ? 'Record payment' : 'Waive'} for ${periodLabel(charge.period)}`}>
      {mode === 'record' && (
        <select value={method} onChange={(e) => setMethod(e.target.value)} className='input w-auto py-1 text-xs' aria-label='Payment method'>
          {RECORDABLE_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      )}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder={mode === 'record' ? 'Note (optional)' : 'Reason (optional)'}
        aria-label='Note'
        className='input w-40 py-1 text-xs'
      />
      <button disabled={busy} className='btn-primary px-3 py-1 text-xs'>
        {mode === 'record' ? 'Save' : 'Waive month'}
      </button>
      <button type='button' onClick={() => setMode(null)} className='btn-ghost px-2 py-1 text-xs'>
        Cancel
      </button>
    </form>
  );
}

function ChargeRow({ charge, role, active, busy, onAction }) {
  const state = chargeStateInfo(charge.state);
  const unpaid = charge.status === 'unpaid';
  return (
    <tr className='border-t align-top'>
      <td className='py-3 pr-3'>
        <p className='font-medium text-slate-900'>{periodLabel(charge.period)}</p>
        <p className='text-xs text-slate-500'>Due {formatLeaseDate(charge.dueDate)}</p>
      </td>
      <td className='py-3 pr-3 font-medium text-slate-800'>{formatMoney(charge.amount)}</td>
      <td className='py-3 pr-3'>
        <span className={`badge ring-1 ${state.tone}`}>{state.label}</span>
        {charge.daysOverdue > 0 && <p className='mt-1 text-xs text-red-700'>{charge.daysOverdue} days late</p>}
        {charge.status === 'paid' && (
          <p className='mt-1 text-xs text-slate-500'>
            {METHOD_LABELS[charge.method] ?? 'Paid'} · {formatLeaseDate(charge.paidAt)}
            {charge.reference && ` · ${charge.reference}`}
          </p>
        )}
        {charge.note && <p className='mt-1 text-xs italic text-slate-500'>{charge.note}</p>}
      </td>
      <td className='py-3'>
        {unpaid && role === 'tenant' && (
          <button type='button' disabled={busy} onClick={() => onAction('pay', charge)} className='btn-primary px-3 py-1 text-xs'>
            Pay {formatMoney(charge.amount)}
          </button>
        )}
        {unpaid && role === 'owner' && active && <OwnerChargeActions charge={charge} busy={busy} onAction={onAction} />}
      </td>
    </tr>
  );
}

function EndLease({ lease, busy, onEnd }) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(toDateInput(new Date()));

  if (!open) {
    return (
      <button type='button' onClick={() => setOpen(true)} className='btn-ghost text-sm text-red-700'>
        End lease
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onEnd(endDate);
      }}
      className='card flex flex-wrap items-end gap-3 p-4'
    >
      <label className='flex flex-col gap-1'>
        <span className='label'>Last day of the lease</span>
        <input type='date' required value={endDate} min={toDateInput(lease.startDate)} onChange={(e) => setEndDate(e.target.value)} className='input' />
      </label>
      <p className='basis-full text-sm text-slate-600'>Unpaid months after this day are removed. Rent already owed stays owed.</p>
      <button disabled={busy} className='btn-danger'>
        End lease
      </button>
      <button type='button' onClick={() => setOpen(false)} className='btn-secondary'>
        Keep lease
      </button>
    </form>
  );
}

export default function LeaseDetail() {
  const { leaseId } = useParams();
  const { data, error, loading } = useFetchJson(`/api/leases/${leaseId}`);
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (loading && !data) return <p className='container-page py-8 text-slate-600'>Loading...</p>;
  if (error) {
    return (
      <main className='container-page py-16 text-center'>
        <h1 className='page-title'>Lease not found</h1>
        <Link to='/rent' className='btn-primary mt-6'>
          Back to rent
        </Link>
      </main>
    );
  }

  const { lease, charges, summary, viewer } = latest ?? data;
  const isOwner = viewer.role === 'owner';
  const active = lease.status === 'active';
  const other = isOwner ? lease.tenant : lease.owner;

  const run = async (request) => {
    setBusy(true);
    setActionError(null);
    try {
      setLatest(await request());
    } catch (err) {
      setActionError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onAction = (action, charge, body) =>
    run(() => postJson(`/api/leases/${lease._id}/charges/${charge._id}/${action}`, body));

  return (
    <main className='container-page flex max-w-4xl flex-col gap-6 py-8'>
      <Link
        to={isOwner ? '/rent?as=owner' : '/rent'}
        className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'
      >
        <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> All leases
      </Link>

      <header className='card p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>
              {lease.listing ? <Link to={`/listing/${lease.listing._id}`}>{lease.listing.name}</Link> : 'Listing removed'}
            </h1>
            {lease.listing?.address && <p className='text-sm text-slate-500'>{lease.listing.address}</p>}
          </div>
          <span className={`badge ring-1 ${active ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
            {active ? 'Active' : 'Ended'}
          </span>
        </div>
        <dl className='mt-4 grid gap-3 text-sm sm:grid-cols-4'>
          <div>
            <dt className='text-slate-500'>Rent</dt>
            <dd className='font-medium text-slate-800'>{formatMoney(lease.monthlyRent, lease.currency)} / month</dd>
          </div>
          <div>
            <dt className='text-slate-500'>Due</dt>
            <dd className='font-medium text-slate-800'>On the {ordinal(lease.dueDay)}</dd>
          </div>
          <div>
            <dt className='text-slate-500'>Term</dt>
            <dd className='font-medium text-slate-800'>
              {formatLeaseDate(lease.startDate)} – {lease.endDate ? formatLeaseDate(lease.endDate) : 'ongoing'}
            </dd>
          </div>
          <div>
            <dt className='text-slate-500'>{isOwner ? 'Tenant' : 'Owner'}</dt>
            <dd className='font-medium text-slate-800'>{other?.username ?? 'Deleted user'}</dd>
          </div>
        </dl>
        {lease.notes && <p className='mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700'>{lease.notes}</p>}
      </header>

      <SummaryCards summary={summary} currency={lease.currency} />

      {actionError && (
        <p className='text-sm text-red-700' role='alert'>
          {actionError}
        </p>
      )}

      <section aria-labelledby='charges-title' className='card p-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 id='charges-title' className='text-lg font-semibold text-slate-900'>
            Rent by month
          </h2>
          <button
            type='button'
            onClick={() => downloadCsv(`/api/leases/${lease._id}/export`, 'rent-ledger.csv').catch(() => setActionError('Could not download the ledger.'))}
            className='btn-ghost text-sm'
          >
            <FaDownload className='h-3 w-3' aria-hidden='true' /> Download ledger
          </button>
        </div>
        {charges.length === 0 ? (
          <p className='mt-3 text-sm text-slate-600'>The first rent is charged in the month the lease starts.</p>
        ) : (
          <div className='mt-3 overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='text-xs uppercase text-slate-500'>
                <tr>
                  <th className='pb-2 pr-3 font-medium'>Month</th>
                  <th className='pb-2 pr-3 font-medium'>Amount</th>
                  <th className='pb-2 pr-3 font-medium'>Status</th>
                  <th className='pb-2 font-medium'>
                    <span className='sr-only'>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <ChargeRow key={charge._id} charge={charge} role={viewer.role} active={active} busy={busy} onAction={onAction} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isOwner && active && <EndLease lease={lease} busy={busy} onEnd={(endDate) => run(() => postJson(`/api/leases/${lease._id}/end`, { endDate }))} />}
    </main>
  );
}
