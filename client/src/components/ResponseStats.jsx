import { FaRegClock } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';

// "Usually replies within 3 hours · 95% response rate". Shows nothing until
// the owner has enough recent conversations for the numbers to mean much.
export default function ResponseStats({ ownerId, className = '' }) {
  const { data } = useFetchJson(`/api/user/public/${ownerId}/response-stats`);
  const stats = data?.stats;
  if (!stats) return null;

  return (
    <p className={`flex items-center gap-2 text-sm text-slate-600 ${className}`}>
      <FaRegClock className='shrink-0 text-slate-400' aria-hidden='true' />
      <span>
        {stats.responseTime ? `Usually replies ${stats.responseTime}` : 'Rarely replies'}
        <span className='text-slate-400'> · </span>
        {stats.responseRate}% response rate
      </span>
    </p>
  );
}
