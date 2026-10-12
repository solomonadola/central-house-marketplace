import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaShieldAlt } from 'react-icons/fa';
import { updateUserSuccess } from '../redux/user/userSlice';
import { apiFetch } from '../utils/apiFetch';

// Turns two-step sign-in on or off, after confirming the password.
export default function TwoFactorSettings() {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const enabled = Boolean(currentUser?.twoFactorEnabled);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch('/api/user/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled, password }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      dispatch(updateUserSuccess({ ...currentUser, twoFactorEnabled: data.twoFactorEnabled }));
      setConfirming(false);
      setPassword('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby='two-factor-title' className='mt-10'>
      <h2 id='two-factor-title' className='flex items-center gap-2 text-lg font-semibold text-slate-900'>
        <FaShieldAlt className='text-brand-600' aria-hidden='true' /> Two-step sign-in
      </h2>
      <p className='mt-1 text-sm text-slate-600'>
        When you sign in with your password, we&apos;ll also email you a code to enter. Signing in with Google
        isn&apos;t affected.
      </p>
      <div className='card mt-3 p-4'>
        <p className='text-sm'>
          Status:{' '}
          <span className={`font-semibold ${enabled ? 'text-green-700' : 'text-slate-700'}`}>{enabled ? 'On' : 'Off'}</span>
        </p>
        {confirming ? (
          <form onSubmit={submit} className='mt-3 flex flex-col gap-2'>
            <label htmlFor='two-factor-password' className='label'>
              Enter your password to confirm
            </label>
            <input
              id='two-factor-password'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='input'
            />
            {error && <p className='text-sm text-red-700'>{error}</p>}
            <div className='flex gap-2'>
              <button disabled={busy || !password} className={enabled ? 'btn-danger' : 'btn-primary'}>
                {enabled ? 'Turn off' : 'Turn on'}
              </button>
              <button type='button' onClick={() => setConfirming(false)} className='btn-ghost'>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type='button' onClick={() => setConfirming(true)} className='btn-secondary mt-3'>
            {enabled ? 'Turn off two-step sign-in' : 'Turn on two-step sign-in'}
          </button>
        )}
      </div>
    </section>
  );
}
