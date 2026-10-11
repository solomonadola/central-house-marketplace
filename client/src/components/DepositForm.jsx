import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHandHoldingUsd } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';
import { formatMoney, paymentStatus } from '../utils/paymentStatus';

// Lets an approved applicant put down a holding deposit. A real payment
// provider would redirect to a checkout page; here "Confirm payment"
// simulates the provider confirming the charge.
export default function DepositForm({ applicationId }) {
  const [amount, setAmount] = useState('500');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const call = async (url, options) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(url, options);
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return null;
      }
      return data;
    } catch {
      setError('Something went wrong. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    const data = await call('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, amount }),
    });
    if (data) setPayment(data);
  };

  const confirm = async () => {
    const data = await call(`/api/payments/${payment._id}/confirm`, { method: 'POST' });
    if (data) setPayment(data);
  };

  const cancel = async () => {
    const data = await call(`/api/payments/${payment._id}/cancel`, { method: 'POST' });
    if (data) setPayment(null);
  };

  if (!payment) {
    return (
      <form onSubmit={create} className='mt-1 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3'>
        <label className='flex flex-col gap-1 text-sm text-slate-600'>
          Holding deposit
          <input
            type='number'
            min='10'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label='Holding deposit'
            className='input w-32'
          />
        </label>
        <button type='submit' disabled={busy} className='btn-secondary text-sm'>
          <FaHandHoldingUsd aria-hidden='true' /> Reserve this home
        </button>
        {error && <p className='w-full text-sm text-red-700'>{error}</p>}
      </form>
    );
  }

  const status = paymentStatus(payment.status);
  return (
    <div className='mt-1 flex flex-col gap-2 border-t border-slate-100 pt-3'>
      <p className='text-sm text-slate-700'>
        Deposit reference {payment.reference} · {formatMoney(payment.amount, payment.currency)}{' '}
        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </p>
      {payment.status === 'pending' && (
        <div className='flex gap-3 text-sm'>
          <button type='button' disabled={busy} onClick={confirm} className='font-semibold text-green-700 hover:underline'>
            Confirm payment
          </button>
          <button type='button' disabled={busy} onClick={cancel} className='text-slate-600 hover:underline'>
            Cancel
          </button>
        </div>
      )}
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <Link to='/payments' className='text-xs text-blue-800 hover:underline'>
        View all deposits
      </Link>
    </div>
  );
}
