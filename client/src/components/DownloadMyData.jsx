import { useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import { downloadCsv } from '../utils/downloadCsv';

// Downloads everything the app stores about the user as a JSON file.
// downloadCsv handles any file type; it's named for its first use.
export default function DownloadMyData() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadCsv('/api/user/export', 'central-house-data.json');
    } catch {
      setError('Could not prepare your data. Please try again in a few minutes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby='download-data-title' className='mt-10'>
      <h2 id='download-data-title' className='text-lg font-semibold text-slate-900'>
        Your data
      </h2>
      <p className='mt-1 text-sm text-slate-600'>
        Download a copy of everything we store about you: your profile, listings, messages, reviews, viewings and
        more, as a JSON file.
      </p>
      {error && <p className='mt-3 text-sm text-red-700'>{error}</p>}
      <button type='button' onClick={download} disabled={busy} className='btn-secondary mt-3'>
        <FaDownload aria-hidden='true' /> {busy ? 'Preparing...' : 'Download my data'}
      </button>
    </section>
  );
}
