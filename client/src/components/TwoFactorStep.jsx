import { useState } from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';

const postJson = async (url, body) => {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

// Second step of sign-in: enter the 6-digit code that was emailed.
// Calls onSignedIn(user) once the code is accepted.
export default function TwoFactorStep({ challenge, onSignedIn, onCancel }) {
  const [token, setToken] = useState(challenge.challengeToken);
  const [email, setEmail] = useState(challenge.email);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await postJson('/api/auth/verify-2fa', { challengeToken: token, code });
      if (data.success === false) {
        setError(data.message);
        return;
      }
      onSignedIn(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    const data = await postJson('/api/auth/resend-2fa', { challengeToken: token });
    if (data.success === false) {
      setError(data.message);
      return;
    }
    setToken(data.challengeToken);
    setEmail(data.email);
    setCode('');
    setNotice('We sent a new code.');
  };

  return (
    <form onSubmit={submit} className='flex flex-col gap-4'>
      <div className='flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-900'>
        <FaShieldAlt className='mt-0.5 shrink-0 text-brand-600' aria-hidden='true' />
        <p>
          We emailed a 6-digit code to <span className='font-semibold'>{email}</span>. It expires in 10 minutes.
        </p>
      </div>
      <div>
        <label htmlFor='two-factor-code' className='label'>
          Sign-in code
        </label>
        <input
          id='two-factor-code'
          inputMode='numeric'
          autoComplete='one-time-code'
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className='input text-center text-2xl font-semibold tracking-[0.5em]'
          autoFocus
        />
      </div>
      {error && (
        <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </p>
      )}
      {notice && <p className='text-sm text-green-700'>{notice}</p>}
      <button disabled={busy || code.length !== 6} className='btn-primary w-full py-3'>
        {busy ? 'Checking...' : 'Verify and sign in'}
      </button>
      <div className='flex justify-between text-sm'>
        <button type='button' onClick={resend} className='font-semibold text-brand-700 hover:text-brand-800'>
          Send a new code
        </button>
        <button type='button' onClick={onCancel} className='text-slate-600 hover:underline'>
          Use a different account
        </button>
      </div>
    </form>
  );
}
