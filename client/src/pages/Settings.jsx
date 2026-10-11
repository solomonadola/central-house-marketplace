import { useEffect, useState } from 'react';
import { FaBell, FaEnvelopeOpenText } from 'react-icons/fa';
import BlockedUsers from '../components/BlockedUsers';
import QuickRepliesManager from '../components/QuickRepliesManager';
import DownloadMyData from '../components/DownloadMyData';
import { apiFetch } from '../utils/apiFetch';

const OPTIONS = [
  {
    key: 'emailNotifications',
    Icon: FaBell,
    title: 'Email me about activity',
    description: 'Messages, viewing requests and application updates are emailed to you as well as shown in the app.',
  },
  {
    key: 'marketingEmails',
    Icon: FaEnvelopeOpenText,
    title: 'Product news and tips',
    description: 'Occasional emails about new features and advice for listing your home.',
  },
];

export default function Settings() {
  const [preferences, setPreferences] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch('/api/user/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success === false) {
          setError(data.message);
          return;
        }
        setPreferences(data);
      })
      .catch(() => active && setError('Could not load your preferences.'));
    return () => {
      active = false;
    };
  }, []);

  const toggle = (key) => {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setPreferences(data);
      setSaved(true);
    } catch {
      setError('Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className='container-page max-w-2xl py-6 sm:py-8'>
      <h1 className='page-title'>Notification settings</h1>
      <p className='mt-1 text-sm text-slate-600'>Choose what we email you about.</p>

      {error && <p className='mt-4 text-red-700'>{error}</p>}
      {!preferences && !error && <p className='mt-4 text-slate-600'>Loading...</p>}

      {preferences && (
        <form onSubmit={save} className='mt-6 flex flex-col gap-4'>
          {OPTIONS.map(({ key, Icon, title, description }) => (
            <label key={key} className='card flex cursor-pointer items-start gap-4 p-4'>
              <Icon className='mt-0.5 h-5 w-5 shrink-0 text-brand-600' aria-hidden='true' />
              <span className='flex-1'>
                <span className='block font-semibold text-slate-800'>{title}</span>
                <span className='mt-0.5 block text-sm text-slate-600'>{description}</span>
              </span>
              <input
                type='checkbox'
                className='mt-1 h-5 w-5 accent-brand-600'
                checked={Boolean(preferences[key])}
                onChange={() => toggle(key)}
                aria-label={title}
              />
            </label>
          ))}

          <div className='flex items-center gap-3'>
            <button type='submit' disabled={saving} className='btn-primary'>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            {saved && <p className='text-sm text-green-700'>Settings saved.</p>}
          </div>
        </form>
      )}

      <QuickRepliesManager />
      <BlockedUsers />
      <DownloadMyData />
    </main>
  );
}
