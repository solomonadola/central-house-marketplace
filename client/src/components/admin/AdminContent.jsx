import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetchJson } from '../../hooks/useFetchJson';
import { apiFetch } from '../../utils/apiFetch';
import { formatShortTime } from '../../utils/formatTime';
import { describeReasons } from '../../utils/moderation';
import ReasonForm from './ReasonForm';

const post = async (url, body) => {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.message);
  return data;
};

const contentUrl = (item, action) => `/api/admin/content/${item.targetType}/${item.targetId}/${action}`;

function FlaggedItem({ item, onDone, onError }) {
  const [removing, setRemoving] = useState(false);

  const act = async (action, body) => {
    try {
      await post(contentUrl(item, action), body);
      onDone();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <li className='card flex flex-col gap-2 p-4'>
      <div className='flex flex-wrap items-center gap-2 text-sm'>
        <span className='badge bg-slate-100 capitalize text-slate-700'>{item.targetType}</span>
        <span className='badge bg-red-50 text-red-700'>
          {item.flagCount} {item.flagCount === 1 ? 'flag' : 'flags'}
        </span>
        <span className='text-slate-500'>
          by {item.author?.username ?? 'deleted user'} on{' '}
          <Link to={`/listing/${item.listing._id}`} className='hover:underline'>
            {item.listing.name}
          </Link>{' '}
          · last flagged {formatShortTime(item.lastFlaggedAt)}
        </span>
      </div>
      <blockquote className='whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-slate-800'>
        {item.rating && <span className='mr-2 font-semibold text-amber-600'>{item.rating}★</span>}
        {item.text}
      </blockquote>
      <p className='text-xs text-slate-600'>{describeReasons(item.reasons)}</p>
      {item.details.length > 0 && (
        <ul className='list-inside list-disc text-xs text-slate-500'>
          {item.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      {removing ? (
        <ReasonForm
          label='Reason shown to the author'
          confirmLabel='Remove'
          onConfirm={(reason) => act('remove', { reason })}
          onCancel={() => setRemoving(false)}
        />
      ) : (
        <div className='flex gap-3 text-sm'>
          <button type='button' onClick={() => setRemoving(true)} className='text-red-700 hover:underline'>
            Remove {item.targetType}
          </button>
          <button type='button' onClick={() => act('dismiss')} className='text-slate-600 hover:underline'>
            Keep it and dismiss flags
          </button>
        </div>
      )}
    </li>
  );
}

function RemovedList({ refreshKey, onError }) {
  // A new refreshKey changes the URL, which reloads the list after
  // something is removed above. The server ignores the parameter.
  const { data, reload } = useFetchJson(`/api/admin/content/removed?r=${refreshKey}`);
  if (!Array.isArray(data) || data.length === 0) return null;

  const restore = async (item) => {
    try {
      await post(contentUrl(item, 'restore'));
      reload();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <section aria-labelledby='removed-title' className='flex flex-col gap-2'>
      <h3 id='removed-title' className='font-semibold text-slate-800'>
        Recently removed
      </h3>
      <ul className='flex flex-col divide-y rounded-lg border bg-white'>
        {data.map((item) => (
          <li key={item.targetId} className='flex flex-wrap items-center gap-3 p-3 text-sm'>
            <div className='min-w-[200px] flex-1'>
              <p className='truncate text-slate-800'>{item.text}</p>
              <p className='text-xs text-slate-500'>
                <span className='capitalize'>{item.targetType}</span> by {item.author?.username ?? 'deleted user'} ·{' '}
                {item.removedReason} · {formatShortTime(item.removedAt)}
              </p>
            </div>
            <button type='button' onClick={() => restore(item)} className='text-green-700 hover:underline'>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Reviews and questions users flagged, and the ones already removed.
export default function AdminContent() {
  const { data, error, loading, reload } = useFetchJson('/api/admin/content/flagged');
  const [actionError, setActionError] = useState(null);
  const [handled, setHandled] = useState(0);

  const done = () => {
    setActionError(null);
    setHandled((n) => n + 1);
    reload();
  };

  if (loading && !data) return <p className='text-slate-600'>Loading...</p>;
  if (error) return <p className='text-red-700'>{error}</p>;

  return (
    <div className='flex flex-col gap-6'>
      {actionError && (
        <p className='text-red-700' role='alert'>
          {actionError}
        </p>
      )}
      {data.length === 0 ? (
        <p className='text-slate-600'>Nothing flagged right now.</p>
      ) : (
        <ul className='flex flex-col gap-3'>
          {data.map((item) => (
            <FlaggedItem key={item.targetId} item={item} onDone={done} onError={setActionError} />
          ))}
        </ul>
      )}
      <RemovedList refreshKey={handled} onError={setActionError} />
    </div>
  );
}
