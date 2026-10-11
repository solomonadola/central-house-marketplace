import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setSent(data.message);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl text-center font-semibold my-7'>Forgot password</h1>
      {sent ? (
        <p className='text-green-700 text-center'>{sent}</p>
      ) : (
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <p className='text-slate-600'>
            Enter the email you signed up with and we&apos;ll send you a link to reset your password.
          </p>
          <input
            type='email'
            required
            placeholder='email'
            aria-label='Email'
            className='border p-3 rounded-lg'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            disabled={sending}
            className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
          >
            {sending ? 'Sending...' : 'Send reset link'}
          </button>
          {error && <p className='text-red-500'>{error}</p>}
        </form>
      )}
      <p className='mt-5 text-center'>
        <Link to='/sign-in' className='text-blue-700 hover:underline'>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
