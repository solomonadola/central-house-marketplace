import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa';
import { useFetchJson } from '../../hooks/useFetchJson';
import { apiFetch } from '../../utils/apiFetch';
import { downloadCsv } from '../../utils/downloadCsv';
import { formatShortTime } from '../../utils/formatTime';
import ReasonForm from './ReasonForm';

const REASON_LABELS = {
  scam: 'Scam',
  inaccurate: 'Inaccurate',
  unavailable: 'Unavailable',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

const post = (url, method, body) =>
  apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  }).then((res) => res.json());

function ReportCard({ report, onChanged }) {
  const [hiding, setHiding] = useState(false);
  const [error, setError] = useState(null);
  const { listing } = report;

  const act = async (request) => {
    setError(null);
    const data = await request();
    if (data.success === false) {
      setError(data.message);
      return;
    }
    setHiding(false);
    onChanged();
  };

  const setStatus = (status) => act(() => post(`/api/admin/reports/${report._id}`, 'PATCH', { status }));
  const hide = (reason) => act(() => post(`/api/admin/listings/${listing._id}/hide`, 'POST', { reason }));

  return (
    <li className='border rounded-lg p-3 bg-white flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5'>
          {REASON_LABELS[report.reason] ?? report.reason}
        </span>
        {listing ? (
          <Link to={`/listing/${listing._id}`} className='font-semibold text-slate-700 hover:underline'>
            {listing.name}
          </Link>
        ) : (
          <span className='text-slate-500'>Listing deleted</span>
        )}
        {listing?.hidden && <span className='text-xs text-slate-500'>(hidden)</span>}
        {report.openReportsForListing > 1 && (
          <span className='text-xs text-red-700 font-semibold'>{report.openReportsForListing} open reports</span>
        )}
      </div>
      {report.details && <p className='text-slate-700 whitespace-pre-wrap'>{report.details}</p>}
      <p className='text-xs text-slate-500'>
        Reported by {report.reporter?.username ?? 'deleted user'} · {formatShortTime(report.createdAt)} · {report.status}
      </p>
      {error && <p className='text-sm text-red-700'>{error}</p>}
      {hiding ? (
        <ReasonForm
          label='Reason shown to the owner'
          confirmLabel='Hide listing'
          onConfirm={hide}
          onCancel={() => setHiding(false)}
        />
      ) : (
        <div className='flex flex-wrap gap-3 text-sm'>
          {report.status === 'open' && listing && !listing.hidden && (
            <button type='button' onClick={() => setHiding(true)} className='text-red-700 font-semibold hover:underline'>
              Hide listing
            </button>
          )}
          {report.status === 'open' ? (
            <>
              <button type='button' onClick={() => setStatus('resolved')} className='text-green-700 hover:underline'>
                Mark resolved
              </button>
              <button type='button' onClick={() => setStatus('dismissed')} className='text-slate-600 hover:underline'>
                Dismiss
              </button>
            </>
          ) : (
            <button type='button' onClick={() => setStatus('open')} className='text-slate-600 hover:underline'>
              Reopen
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function AdminReports() {
  const [status, setStatus] = useState('open');
  const { data, error, loading, reload } = useFetchJson(`/api/admin/reports?status=${status}`);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv(`/api/admin/reports/export?status=${status}`, 'reports.csv');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <label className='flex items-center gap-2 text-sm'>
          Show
          <select value={status} onChange={(e) => setStatus(e.target.value)} className='border rounded-lg p-2'>
            <option value='open'>Open reports</option>
            <option value='resolved'>Resolved</option>
            <option value='dismissed'>Dismissed</option>
            <option value='all'>All</option>
          </select>
        </label>
        <button type='button' onClick={exportCsv} disabled={exporting} className='btn-secondary text-sm'>
          <FaDownload className='h-3 w-3' aria-hidden='true' /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
      {loading && !data && <p className='text-slate-600'>Loading...</p>}
      {error && <p className='text-red-700'>{error}</p>}
      {data && data.length === 0 && (
        <p className='text-slate-600'>{status === 'open' ? 'No open reports. All caught up!' : 'No reports.'}</p>
      )}
      <ul className='flex flex-col gap-3'>
        {data?.map((report) => (
          <ReportCard key={report._id} report={report} onChanged={reload} />
        ))}
      </ul>
    </div>
  );
}
