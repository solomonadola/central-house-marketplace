import { useDispatch, useSelector } from 'react-redux';
import { FaBalanceScale } from 'react-icons/fa';
import { MAX_COMPARE, toggleCompare } from '../redux/compare/compareSlice';

export default function CompareButton({ listingId, className = '' }) {
  const dispatch = useDispatch();
  const ids = useSelector((state) => state.compare.ids);
  const selected = ids.includes(listingId);
  const full = ids.length >= MAX_COMPARE;

  const label = selected ? 'Remove from comparison' : full ? 'Comparison is full' : 'Add to comparison';

  const handleClick = (e) => {
    // The button sits inside listing card links.
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleCompare(listingId));
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      disabled={!selected && full}
      className={`flex items-center justify-center rounded-full shadow w-10 h-10 transition-transform ${
        selected ? 'bg-brand-600 text-white' : 'bg-white/90 text-slate-600 hover:scale-110'
      } disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <FaBalanceScale className='text-lg' aria-hidden='true' />
    </button>
  );
}
