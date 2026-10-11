import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import AuthLayout from '../components/AuthLayout';

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
    <AuthLayout
      title='Forgot your password?'
      subtitle="Enter the email you signed up with and we'll send you a link to reset it."
    >
      {sent ? (
        <p role='status' className='rounded-lg bg-green-50 p-4 text-green-800'>
          {sent}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label htmlFor='forgot-email' className='label'>
              Email
            </label>
            <input
              id='forgot-email'
              type='email'
              required
              autoComplete='email'
              className='input'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
              {error}
            </p>
          )}
          <button disabled={sending} className='btn-primary w-full py-3'>
            {sending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className='mt-6 text-center text-sm'>
        <Link to='/sign-in' className='font-semibold text-brand-700 hover:text-brand-800'>
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
