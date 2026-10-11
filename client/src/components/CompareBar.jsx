import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaBalanceScale, FaTimes } from 'react-icons/fa';
import { clearCompare, MAX_COMPARE, removeFromCompare } from '../redux/compare/compareSlice';

export default function CompareBar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const ids = useSelector((state) => state.compare.ids);

  if (ids.length === 0 || location.pathname === '/compare') return null;

  const canCompare = ids.length >= 2;

  return (
    <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur'>
      <div className='container-page flex flex-wrap items-center gap-3 py-3'>
        <span className='flex items-center gap-2 text-sm font-medium text-slate-700'>
          <FaBalanceScale className='text-brand-600' aria-hidden='true' />
          {ids.length} of {MAX_COMPARE} homes selected
        </span>
        <ul className='flex flex-wrap gap-1'>
          {ids.map((id, index) => (
            <li key={id}>
              <button
                type='button'
                onClick={() => dispatch(removeFromCompare(id))}
                aria-label={`Remove home ${index + 1} from comparison`}
                className='flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200'
              >
                Home {index + 1}
                <FaTimes className='h-2.5 w-2.5' aria-hidden='true' />
              </button>
            </li>
          ))}
        </ul>
        <div className='ml-auto flex items-center gap-2'>
          <button type='button' onClick={() => dispatch(clearCompare())} className='btn-ghost text-sm'>
            Clear
          </button>
          {canCompare ? (
            <Link to='/compare' className='btn-primary text-sm'>
              Compare
            </Link>
          ) : (
            <span className='text-xs text-slate-500'>Pick at least 2 to compare</span>
          )}
        </div>
      </div>
    </div>
  );
}
