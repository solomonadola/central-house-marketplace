import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetchJson } from '../../hooks/useFetchJson';
import { formatShortTime } from '../../utils/formatTime';

const ACTION_LABELS = {
  hide_listing: { label: 'Hid listing', tone: 'bg-red-100 text-red-800' },
  unhide_listing: { label: 'Restored listing', tone: 'bg-green-100 text-green-800' },
  suspend_user: { label: 'Suspended user', tone: 'bg-red-100 text-red-800' },
  unsuspend_user: { label: 'Reinstated user', tone: 'bg-green-100 text-green-800' },
  resolve_report: { label: 'Resolved report', tone: 'bg-green-100 text-green-800' },
  dismiss_report: { label: 'Dismissed report', tone: 'bg-slate-200 text-slate-700' },
  reopen_report: { label: 'Reopened report', tone: 'bg-amber-100 text-amber-800' },
};

const targetLink = (entry) => {
  if (entry.targetType === 'listing') return `/listing/${entry.targetId}`;
  return null;
};

export default function AdminAuditLog() {
  const [action, setAction] = useState('');
  const { data, error, loading } = useFetchJson(`/api/admin/audit${action ? `?action=${action}` : ''}`);

  return (
    <div className='flex flex-col gap-3'>
      <label className='flex items-center gap-2 text-sm'>
        Action
        <select value={action} onChange={(e) => setAction(e.target.value)} className='border rounded-lg p-2'>
          <option value=''>All actions</option>
          {Object.entries(ACTION_LABELS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}
      {data && data.length === 0 && <p className='text-slate-600'>No admin actions recorded yet.</p>}

      <ul className='flex flex-col gap-2'>
        {data?.map((entry) => {
          const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, tone: 'bg-slate-200 text-slate-700' };
          const link = targetLink(entry);
          return (
            <li key={entry._id} className='border rounded-lg p-3 bg-white flex flex-col gap-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className={`rounded-full text-xs font-semibold px-2 py-0.5 ${meta.tone}`}>{meta.label}</span>
                {entry.targetLabel &&
                  (link ? (
                    <Link to={link} className='font-medium text-slate-700 hover:underline'>
                      {entry.targetLabel}
                    </Link>
                  ) : (
                    <span className='font-medium text-slate-700'>{entry.targetLabel}</span>
                  ))}
              </div>
              <p className='text-xs text-slate-500'>
                by {entry.actor?.username ?? 'deleted admin'} · {formatShortTime(entry.createdAt)}
              </p>
              {entry.reason && <p className='text-sm text-slate-700'>&ldquo;{entry.reason}&rdquo;</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
