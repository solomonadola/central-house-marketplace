import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { formatMoney } from '../utils/paymentStatus';
import { METHOD_LABELS, formatLeaseDate, periodLabel } from '../utils/rent';

// A printable receipt for one paid month of rent, e.g. as proof of payment
// for a tenant's records.
export default function RentReceipt() {
  const { leaseId, chargeId } = useParams();
  const { data, error, loading } = useFetchJson(`/api/leases/${leaseId}`);

  if (loading && !data) return <p className='container-page py-8 text-slate-600'>Loading...</p>;

  const charge = data?.charges?.find((c) => c._id === chargeId);
  if (error || !charge || charge.status !== 'paid') {
    return (
      <main className='container-page py-16 text-center'>
        <h1 className='page-title'>Receipt not available</h1>
        <p className='mt-2 text-slate-600'>Receipts exist for months that have been paid.</p>
        <Link to={`/leases/${leaseId}`} className='btn-primary mt-6'>
          Back to lease
        </Link>
      </main>
    );
  }

  const { lease } = data;
  const rows = [
    ['Rent for', periodLabel(charge.period)],
    ['Home', lease.listing ? `${lease.listing.name}${lease.listing.address ? `, ${lease.listing.address}` : ''}` : 'Listing removed'],
    ['Tenant', lease.tenant?.username ?? 'Deleted user'],
    ['Paid to', lease.owner?.username ?? 'Deleted user'],
    ['Due date', formatLeaseDate(charge.dueDate)],
    ['Paid on', formatLeaseDate(charge.paidAt)],
    ['Method', METHOD_LABELS[charge.method] ?? 'Other'],
    ...(charge.reference ? [['Reference', charge.reference]] : []),
    ...(charge.note ? [['Note', charge.note]] : []),
  ];

  return (
    <main className='container-page flex max-w-2xl flex-col gap-6 py-8'>
      <div className='flex flex-wrap items-center justify-between gap-3 print:hidden'>
        <Link to={`/leases/${leaseId}`} className='inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'>
          <FaArrowLeft className='h-3 w-3' aria-hidden='true' /> Back to lease
        </Link>
        <button type='button' onClick={() => window.print()} className='btn-secondary text-sm'>
          <FaPrint className='h-3 w-3' aria-hidden='true' /> Print
        </button>
      </div>

      <article className='card p-8 print:border-0 print:shadow-none' aria-labelledby='receipt-title'>
        <header className='flex flex-wrap items-start justify-between gap-4 border-b pb-4'>
          <div>
            <h1 id='receipt-title' className='text-2xl font-bold text-slate-900'>
              Rent receipt
            </h1>
            <p className='text-sm text-slate-500'>Central House Marketplace</p>
          </div>
          <div className='text-right'>
            <p className='text-sm text-slate-500'>Amount paid</p>
            <p className='text-3xl font-bold text-green-700'>{formatMoney(charge.amount, lease.currency)}</p>
          </div>
        </header>

        <dl className='mt-4 divide-y text-sm'>
          {rows.map(([label, value]) => (
            <div key={label} className='flex justify-between gap-4 py-2'>
              <dt className='text-slate-500'>{label}</dt>
              <dd className='text-right font-medium text-slate-800'>{value}</dd>
            </div>
          ))}
        </dl>

        <p className='mt-6 text-xs text-slate-500'>
          {charge.method === 'online'
            ? 'Paid through Central House.'
            : `Recorded as received by ${lease.owner?.username ?? 'the owner'}.`}{' '}
          Receipt for charge {charge._id}.
        </p>
      </article>
    </main>
  );
}
