import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaBellSlash, FaSearch, FaTrashAlt } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import { describeFilters, savedSearchToQuery } from '../utils/savedSearch';

function SavedSearchRow({ savedSearch, onChanged }) {
  const [busy, setBusy] = useState(false);
  const summary = describeFilters(savedSearch.filters);

  const toggleAlerts = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/saved-searches/${savedSearch._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertsEnabled: !savedSearch.alertsEnabled }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/saved-searches/${savedSearch._id}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className='card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <p className='font-semibold text-slate-800'>{savedSearch.name || summary}</p>
        {savedSearch.name && <p className='text-sm text-slate-500'>{summary}</p>}
      </div>
      <div className='flex shrink-0 flex-wrap items-center gap-2'>
        <Link
          to={`/search?${savedSearchToQuery(savedSearch.filters)}`}
          className='btn-secondary text-sm'
          aria-label={`Run saved search: ${savedSearch.name || summary}`}
        >
          <FaSearch className='h-3 w-3' aria-hidden='true' /> View results
        </Link>
        <button
          type='button'
          onClick={toggleAlerts}
          disabled={busy}
          className='btn-ghost text-sm'
          aria-pressed={savedSearch.alertsEnabled}
        >
          {savedSearch.alertsEnabled ? (
            <>
              <FaBell className='h-3.5 w-3.5 text-brand-600' aria-hidden='true' /> Alerts on
            </>
          ) : (
            <>
              <FaBellSlash className='h-3.5 w-3.5 text-slate-400' aria-hidden='true' /> Alerts off
            </>
          )}
        </button>
        <button
          type='button'
          onClick={remove}
          disabled={busy}
          className='btn-ghost text-sm text-red-700 hover:bg-red-50'
          aria-label={`Delete saved search: ${savedSearch.name || summary}`}
        >
          <FaTrashAlt className='h-3.5 w-3.5' aria-hidden='true' /> Delete
        </button>
      </div>
    </li>
  );
}

export default function SavedSearches() {
  const { data, error, loading, reload } = useFetchJson('/api/saved-searches');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (Array.isArray(data)) setItems(data);
  }, [data]);

  const handleChanged = () => reload();

  return (
    <main className='container-page max-w-3xl py-6 sm:py-8'>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <h1 className='page-title'>Saved searches</h1>
        <Link to='/search' className='btn-secondary text-sm'>
          <FaSearch className='h-3 w-3' aria-hidden='true' /> New search
        </Link>
      </div>

      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className='card p-8 text-center'>
          <p className='text-slate-700'>You don&apos;t have any saved searches yet.</p>
          <p className='mt-1 text-sm text-slate-500'>
            Run a search, then choose &ldquo;Save this search&rdquo; to get alerted when new homes match.
          </p>
        </div>
      )}

      <ul className='flex flex-col gap-3'>
        {items.map((savedSearch) => (
          <SavedSearchRow
            key={savedSearch._id}
            savedSearch={savedSearch}
            onChanged={handleChanged}
          />
        ))}
      </ul>
    </main>
  );
}
