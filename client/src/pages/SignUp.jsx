import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OAuth from '../components/OAuth';
import AuthLayout, { Divider } from '../components/AuthLayout';
import { apiFetch } from '../utils/apiFetch';

export default function SignUp() {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success === false) {
        setLoading(false);
        setError(data.message);
        return;
      }
      setLoading(false);
      setError(null);
      navigate('/sign-in', {
        state: { notice: 'Account created! We sent you a link to confirm your email address.' },
      });
    } catch (error) {
      setLoading(false);
      setError(error.message);
    }
  };
  return (
    <AuthLayout title='Create your account' subtitle='It only takes a minute, and it’s free.'>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div>
          <label htmlFor='username' className='label'>
            Username
          </label>
          <input type='text' id='username' autoComplete='username' required className='input' onChange={handleChange} />
        </div>
        <div>
          <label htmlFor='email' className='label'>
            Email
          </label>
          <input type='email' id='email' autoComplete='email' required className='input' onChange={handleChange} />
        </div>
        <div>
          <label htmlFor='password' className='label'>
            Password
          </label>
          <input
            type='password'
            id='password'
            autoComplete='new-password'
            required
            minLength={8}
            aria-describedby='password-hint'
            className='input'
            onChange={handleChange}
          />
          <p id='password-hint' className='mt-1 text-xs text-slate-500'>
            At least 8 characters.
          </p>
        </div>
        {error && (
          <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
            {error}
          </p>
        )}
        <button disabled={loading} className='btn-primary w-full py-3'>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <Divider />
        <OAuth />
      </form>
      <p className='mt-6 text-center text-sm text-slate-600'>
        Already have an account?{' '}
        <Link to='/sign-in' className='font-semibold text-brand-700 hover:text-brand-800'>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
