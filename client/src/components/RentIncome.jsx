import { useState } from 'react';
import { useFetchJson } from '../hooks/useFetchJson';
import { formatMoney } from '../utils/paymentStatus';
import { niceMax } from '../utils/chart';

const RANGES = [3, 6, 12];

const shortMonth = (period) => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
};

// Owner's rent across all their leases: a bar per month showing what was
// collected against what was expected, plus what tenants owe right now.
export default function RentIncome() {
  const [months, setMonths] = useState(6);
  const { data, error } = useFetchJson(`/api/leases/income?months=${months}`);

  if (error) return <p className='text-sm text-red-700'>{error}</p>;
  if (!data) return null;
  // Nothing to chart until the owner has a lease.
  if (data.totals.activeLeases === 0 && data.totals.expected === 0) return null;

  const { totals } = data;
  const max = niceMax(Math.max(...data.months.map((m) => m.expected), 1));
  const rate = totals.expected > 0 ? Math.round((totals.collected / totals.expected) * 100) : 100;

  return (
    <section aria-labelledby='income-title' className='card p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id='income-title' className='text-lg font-semibold text-slate-900'>
          Rental income
        </h2>
        <div className='flex gap-1' role='group' aria-label='Months shown'>
          {RANGES.map((n) => (
            <button
              key={n}
              type='button'
              aria-pressed={months === n}
              onClick={() => setMonths(n)}
              className={`rounded-md px-2 py-1 text-xs ${months === n ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {n} months
            </button>
          ))}
        </div>
      </div>

      <dl className='mt-4 grid gap-3 text-sm sm:grid-cols-4'>
        <div>
          <dt className='text-slate-500'>Collected</dt>
          <dd className='text-lg font-semibold text-green-700'>{formatMoney(totals.collected)}</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Collection rate</dt>
          <dd className='text-lg font-semibold text-slate-900'>{rate}%</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Owed now</dt>
          <dd className='text-lg font-semibold text-slate-900'>{formatMoney(totals.outstanding)}</dd>
        </div>
        <div>
          <dt className='text-slate-500'>Overdue</dt>
          <dd className={`text-lg font-semibold ${totals.overdue > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {formatMoney(totals.overdue)}
            {totals.overdueCount > 0 && <span className='ml-1 text-xs font-normal text-slate-500'>({totals.overdueCount} {totals.overdueCount === 1 ? 'month' : 'months'})</span>}
          </dd>
        </div>
      </dl>

      <ol className='mt-5 flex h-40 items-end gap-2' aria-label='Rent by month'>
        {data.months.map((m) => (
          <li
            key={m.period}
            className='flex h-full flex-1 flex-col items-center justify-end gap-1'
            aria-label={`${shortMonth(m.period)}: ${formatMoney(m.collected)} of ${formatMoney(m.expected)} collected`}
          >
            <div className='relative w-full max-w-[3rem] flex-1'>
              <div
                className='absolute bottom-0 w-full rounded-t bg-slate-200'
                style={{ height: `${(m.expected / max) * 100}%` }}
              />
              <div
                className='absolute bottom-0 w-full rounded-t bg-brand-600'
                style={{ height: `${(m.collected / max) * 100}%` }}
              />
            </div>
            <span className='text-xs text-slate-500'>{shortMonth(m.period)}</span>
          </li>
        ))}
      </ol>
      <p className='mt-2 flex gap-4 text-xs text-slate-500'>
        <span className='flex items-center gap-1'>
          <span className='h-2 w-2 rounded-sm bg-brand-600' aria-hidden='true' /> Collected
        </span>
        <span className='flex items-center gap-1'>
          <span className='h-2 w-2 rounded-sm bg-slate-200' aria-hidden='true' /> Expected
        </span>
      </p>
    </section>
  );
}
