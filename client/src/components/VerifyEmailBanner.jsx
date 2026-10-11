import { useState } from 'react';
import { useSelector } from 'react-redux';
import { apiFetch } from '../utils/apiFetch';

// Reminds signed-in users with an unconfirmed email to confirm it.
export default function VerifyEmailBanner() {
  const { currentUser } = useSelector((state) => state.user);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  // Only explicit false: users persisted before verification existed have
  // no field, and the server will tell them if it matters.
  if (currentUser?.emailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await apiFetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      setStatus(data.message);
    } catch {
      setStatus('Could not send the link. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div role='status' className='bg-amber-100 text-amber-900 text-sm'>
      <div className='max-w-6xl mx-auto p-2 px-3 flex flex-wrap items-center gap-2'>
        <span>
          Please confirm your email address ({currentUser.email}) to post listings.
        </span>
        {status ? (
          <span className='font-semibold'>{status}</span>
        ) : (
          <button
            type='button'
            onClick={resend}
            disabled={sending}
            className='font-semibold underline disabled:opacity-60'
          >
            {sending ? 'Sending...' : 'Resend confirmation link'}
          </button>
        )}
      </div>
    </div>
  );
}
