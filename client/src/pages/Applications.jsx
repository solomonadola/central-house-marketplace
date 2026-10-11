import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../hooks/useFetchJson';
import { apiFetch } from '../utils/apiFetch';
import DepositForm from '../components/DepositForm';
import { downloadCsv } from '../utils/downloadCsv';
import { applicationStatus, describeApplication, isOpen } from '../utils/applicationStatus';
import { formatShortTime } from '../utils/formatTime';

function ApplicationCard({ application, asOwner, onChanged }) {
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const other = asOwner ? application.applicant : application.owner;
  const status = applicationStatus(application.status);

  const act = async (action, withNote = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/applications/${application._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(withNote && note && { note }) }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setShowNote(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/applications/${application._id}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className='card flex flex-col gap-2 p-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        {application.listing ? (
          <Link to={`/listing/${application.listing._id}`} className='font-semibold text-slate-700 hover:underline'>
            {application.listing.name}
          </Link>
        ) : (
          <span className='text-slate-500'>Listing removed</span>
        )}
      </div>

      <p className='text-sm text-slate-600'>
        {asOwner ? 'From' : 'To'} {other?.username ?? 'deleted user'}
        {asOwner && application.fullName && ` (${application.fullName})`} · {formatShortTime(application.createdAt)}
      </p>

      {describeApplication(application) && (
        <p className='text-sm text-slate-700'>{describeApplication(application)}</p>
      )}
      {application.message && <p className='text-sm text-slate-700'>&ldquo;{application.message}&rdquo;</p>}
      {application.responseNote && (
        <p className='text-sm text-slate-500'>Owner reply: {application.responseNote}</p>
      )}

      {asOwner && (
        <p className='text-sm text-slate-600'>
          <a href={`mailto:${application.email}`} className='text-blue-800 hover:underline'>
            {application.email}
          </a>
          {application.phone && <span> · {application.phone}</span>}
        </p>
      )}

      {error && <p className='text-sm text-red-700'>{error}</p>}

      {showNote && (
        <textarea
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder='Add a note for the applicant (optional)'
          aria-label='Response note'
          className='input'
        />
      )}

      {isOpen(application.status) && (
        <div className='flex flex-wrap gap-3 text-sm'>
          {asOwner ? (
            <>
              {application.status === 'submitted' && (
                <button type='button' disabled={busy} onClick={() => act('review')} className='text-amber-700 hover:underline'>
                  Mark under review
                </button>
              )}
              <button type='button' disabled={busy} onClick={() => act('approve', showNote)} className='text-green-700 font-semibold hover:underline'>
                Approve
              </button>
              <button type='button' disabled={busy} onClick={() => act('reject', showNote)} className='text-red-700 hover:underline'>
                Decline
              </button>
              <button type='button' disabled={busy} onClick={() => setShowNote((v) => !v)} className='text-slate-500 hover:underline'>
                {showNote ? 'Hide note' : 'Add note'}
              </button>
            </>
          ) : (
            <button type='button' disabled={busy} onClick={() => act('withdraw')} className='text-slate-600 hover:underline'>
              Withdraw
            </button>
          )}
        </div>
      )}

      {!isOpen(application.status) && (
        <button type='button' disabled={busy} onClick={remove} className='self-start text-sm text-slate-500 hover:text-red-700 hover:underline'>
          Delete
        </button>
      )}

      {!asOwner && application.status === 'approved' && <DepositForm applicationId={application._id} />}
    </li>
  );
}

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asOwner = searchParams.get('role') === 'owner';
  const { data, error, loading, reload } = useFetchJson(`/api/applications${asOwner ? '?role=owner' : ''}`);
  const [exporting, setExporting] = useState(false);

  const applications = Array.isArray(data) ? data : [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv('/api/applications/export', 'applications.csv');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className='container-page max-w-3xl py-6 sm:py-8'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='page-title'>Applications</h1>
        {asOwner && (
          <button type='button' onClick={exportCsv} disabled={exporting} className='btn-secondary text-sm'>
            <FaDownload className='h-3 w-3' aria-hidden='true' /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      <nav className='mt-4 flex gap-2 border-b' role='tablist'>
        {[
          [false, 'My applications'],
          [true, 'Received'],
        ].map(([owner, label]) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={asOwner === owner}
            onClick={() => setSearchParams(owner ? { role: 'owner' } : {})}
            className={`-mb-px border-b-2 px-3 py-2 ${
              asOwner === owner ? 'border-slate-700 font-semibold text-slate-700' : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && !data && <p className='mt-5 text-slate-600'>Loading...</p>}
      {error && <p className='mt-5 text-red-700'>{error}</p>}
      {!loading && !error && applications.length === 0 && (
        <p className='mt-5 text-slate-600'>
          {asOwner
            ? 'Nobody has applied to your listings yet.'
            : "You haven't applied to any listings yet. Open a listing and choose \"Apply\"."}
        </p>
      )}

      <ul className='mt-5 flex flex-col gap-3'>
        {applications.map((application) => (
          <ApplicationCard key={application._id} application={application} asOwner={asOwner} onChanged={reload} />
        ))}
      </ul>
    </main>
  );
}
