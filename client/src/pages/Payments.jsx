import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { downloadCsv } from '../utils/downloadCsv';
import { formatMoney, paymentStatus } from '../utils/paymentStatus';
import { formatShortTime } from '../utils/formatTime';

function PaymentCard({ payment, asPayee, onChanged }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const other = asPayee ? payment.payer : payment.payee;
  const status = paymentStatus(payment.status);

  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/payments/${payment._id}/${action}`, { method: 'POST' });
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
    <li className='card flex flex-col gap-1 p-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-semibold text-slate-800'>{formatMoney(payment.amount, payment.currency)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        {payment.listing ? (
          <Link to={`/listing/${payment.listing._id}`} className='text-slate-700 hover:underline'>
            {payment.listing.name}
          </Link>
        ) : (
          <span className='text-slate-500'>Listing removed</span>
        )}
      </div>
      <p className='text-xs text-slate-500'>
        Ref {payment.reference} · {asPayee ? 'from' : 'to'} {other?.username ?? 'deleted user'} ·{' '}
        {formatShortTime(payment.createdAt)}
      </p>
      {error && <p className='text-sm text-red-700'>{error}</p>}
      {payment.status === 'pending' && !asPayee && (
        <div className='flex gap-3 text-sm'>
          <button type='button' disabled={busy} onClick={() => act('confirm')} className='font-semibold text-green-700 hover:underline'>
            Confirm payment
          </button>
          <button type='button' disabled={busy} onClick={() => act('cancel')} className='text-slate-600 hover:underline'>
            Cancel
          </button>
        </div>
      )}
      {payment.status === 'paid' && asPayee && (
        <button type='button' disabled={busy} onClick={() => act('refund')} className='self-start text-sm text-slate-600 hover:text-red-700 hover:underline'>
          Refund deposit
        </button>
      )}
    </li>
  );
}

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asPayee = searchParams.get('role') === 'payee';
  const { data, error, loading, reload } = useFetchJson(`/api/payments${asPayee ? '?role=payee' : ''}`);
  const [exporting, setExporting] = useState(false);

  const payments = Array.isArray(data) ? data : [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv(`/api/payments/export${asPayee ? '?role=payee' : ''}`, 'payments.csv');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className='container-page max-w-3xl py-6 sm:py-8'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='page-title'>Holding deposits</h1>
          <p className='mt-1 text-sm text-slate-600'>Refundable deposits that reserve a home.</p>
        </div>
        <button type='button' onClick={exportCsv} disabled={exporting} className='btn-secondary text-sm'>
          <FaDownload className='h-3 w-3' aria-hidden='true' /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <nav className='mt-4 flex gap-2 border-b' role='tablist'>
        {[
          [false, 'Deposits I paid'],
          [true, 'Deposits I received'],
        ].map(([payee, label]) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={asPayee === payee}
            onClick={() => setSearchParams(payee ? { role: 'payee' } : {})}
            className={`-mb-px border-b-2 px-3 py-2 ${
              asPayee === payee ? 'border-slate-700 font-semibold text-slate-700' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && !data && <p className='mt-5 text-slate-600'>Loading...</p>}
      {error && <p className='mt-5 text-red-700'>{error}</p>}
      {!loading && !error && payments.length === 0 && (
        <p className='mt-5 text-slate-600'>
          {asPayee
            ? 'No deposits have been paid for your listings yet.'
            : 'You have not paid any holding deposits. Approve a home and reserve it from your applications.'}
        </p>
      )}

      <ul className='mt-5 flex flex-col gap-3'>
        {payments.map((payment) => (
          <PaymentCard key={payment._id} payment={payment} asPayee={asPayee} onChanged={reload} />
        ))}
      </ul>
    </main>
  );
}
