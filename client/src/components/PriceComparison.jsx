import { FaBalanceScale } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';

// "8% below similar homes nearby", from comparable listings. Shows nothing
// when there aren't enough similar homes to compare with.
export default function PriceComparison({ listingId }) {
  const { data } = useFetchJson(`/api/listing/${listingId}/price-comparison`);
  const comparison = data?.comparison;
  if (!comparison) return null;

  const { percentDifference: diff, comparables, nearbyOnly, medianPrice } = comparison;
  const where = nearbyOnly ? 'similar homes nearby' : 'similar homes';
  const tone =
    diff <= -5 ? 'bg-emerald-50 text-emerald-800' : diff >= 5 ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700';
  const text =
    Math.abs(diff) < 1 ? `In line with ${where}` : `${Math.abs(diff)}% ${diff < 0 ? 'below' : 'above'} ${where}`;

  return (
    <p className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${tone}`}>
      <FaBalanceScale className='mt-0.5 shrink-0' aria-hidden='true' />
      <span>
        <span className='font-semibold'>{text}</span>
        <span className='block text-xs opacity-80'>
          Typical price ${medianPrice.toLocaleString('en-US')}, from {comparables} {comparables === 1 ? 'home' : 'homes'} with the same
          bedrooms
        </span>
      </span>
    </p>
  );
}
