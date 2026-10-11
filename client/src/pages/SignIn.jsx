import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  signInStart,
  signInSuccess,
  signInFailure,
} from '../redux/user/userSlice';
import OAuth from '../components/OAuth';
import AuthLayout, { Divider } from '../components/AuthLayout';
import { apiFetch } from '../utils/apiFetch';

export default function SignIn() {
  const [formData, setFormData] = useState({});
  const { loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  const dispatch = useDispatch();
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(signInStart());
      const res = await apiFetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(signInFailure(data.message));
        return;
      }
      dispatch(signInSuccess(data));
      navigate('/');
    } catch (error) {
      dispatch(signInFailure(error.message));
    }
  };
  return (
    <AuthLayout title='Welcome back' subtitle='Sign in to message owners, save homes and book viewings.'>
      {notice && <p className='mb-6 rounded-lg bg-green-50 p-3 text-sm text-green-800'>{notice}</p>}
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div>
          <label htmlFor='email' className='label'>
            Email
          </label>
          <input type='email' id='email' autoComplete='email' required className='input' onChange={handleChange} />
        </div>
        <div>
          <div className='flex items-baseline justify-between'>
            <label htmlFor='password' className='label'>
              Password
            </label>
            <Link to='/forgot-password' className='text-sm font-medium text-brand-700 hover:text-brand-800'>
              Forgot password?
            </Link>
          </div>
          <input
            type='password'
            id='password'
            autoComplete='current-password'
            required
            className='input'
            onChange={handleChange}
          />
        </div>
        {error && (
          <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>
            {error}
          </p>
        )}
        <button disabled={loading} className='btn-primary w-full py-3'>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <Divider />
        <OAuth />
      </form>
      <p className='mt-6 text-center text-sm text-slate-600'>
        Don&apos;t have an account?{' '}
        <Link to='/sign-up' className='font-semibold text-brand-700 hover:text-brand-800'>
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
