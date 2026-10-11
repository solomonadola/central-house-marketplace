import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl text-center font-semibold my-7'>Choose a new password</h1>
      {done ? (
        <p className='text-center'>
          <span className='text-green-700'>Your password has been reset. </span>
          <Link to='/sign-in' className='text-blue-700 hover:underline'>
            Sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <input
            type='password'
            required
            minLength={8}
            placeholder='new password (at least 8 characters)'
            aria-label='New password'
            autoComplete='new-password'
            className='border p-3 rounded-lg'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type='password'
            required
            placeholder='confirm new password'
            aria-label='Confirm new password'
            autoComplete='new-password'
            className='border p-3 rounded-lg'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            disabled={saving}
            className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
          >
            {saving ? 'Saving...' : 'Reset password'}
          </button>
          {error && (
            <p className='text-red-500'>
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link to='/forgot-password' className='text-blue-700 hover:underline'>
                  Request a new link
                </Link>
              )}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
