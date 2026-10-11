import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { percentChange } from '../utils/formatPrice';

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// A listing's price changes, newest first. Hidden until the price has
// actually changed at least once, since a single entry tells you nothing.
export default function PriceHistory({ listingId, perMonth = false }) {
  const { data } = useFetchJson(`/api/listing/${listingId}/price-history`);
  const history = Array.isArray(data?.history) ? data.history : [];
  if (history.length < 2) return null;

  const suffix = perMonth ? ' / month' : '';

  return (
    <section aria-labelledby='price-history-title'>
      <div className='flex flex-wrap items-center gap-2'>
        <h2 id='price-history-title' className='text-xl font-semibold text-slate-900'>
          Price history
        </h2>
        {data.dropFromPeak > 0 && (
          <span className='badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'>
            Down {data.dropFromPeak}% from its highest price
          </span>
        )}
      </div>
      <ol className='card mt-3 divide-y divide-slate-100'>
        {history.map((entry) => {
          const change = percentChange(entry.price, entry.previousPrice);
          return (
            <li key={entry._id} className='flex items-center justify-between gap-3 px-4 py-3 text-sm'>
              <span className='text-slate-500'>{formatDate(entry.createdAt)}</span>
              <span className='flex items-center gap-3'>
                <span className='font-semibold text-slate-900'>
                  {money(entry.price)}
                  {suffix}
                </span>
                {entry.previousPrice == null ? (
                  <span className='w-16 text-right text-slate-400'>Listed</span>
                ) : (
                  <span
                    className={`flex w-16 items-center justify-end gap-1 font-medium ${
                      change < 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                    aria-label={`${change < 0 ? 'Down' : 'Up'} ${Math.abs(change)}%`}
                  >
                    {change < 0 ? <FaArrowDown aria-hidden='true' /> : <FaArrowUp aria-hidden='true' />}
                    {Math.abs(change)}%
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
