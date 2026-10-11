import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import AuthLayout from '../components/AuthLayout';

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
    <AuthLayout title='Choose a new password' subtitle='Use at least 8 characters.'>
      {done ? (
        <div role='status' className='rounded-lg bg-green-50 p-4 text-green-800'>
          Your password has been reset.{' '}
          <Link to='/sign-in' className='font-semibold underline'>
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label htmlFor='new-password' className='label'>
              New password
            </label>
            <input
              id='new-password'
              type='password'
              required
              minLength={8}
              autoComplete='new-password'
              className='input'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor='confirm-password' className='label'>
              Confirm new password
            </label>
            <input
              id='confirm-password'
              type='password'
              required
              autoComplete='new-password'
              className='input'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link to='/forgot-password' className='font-semibold underline'>
                  Request a new link
                </Link>
              )}
            </p>
          )}
          <button disabled={saving} className='btn-primary w-full py-3'>
            {saving ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
