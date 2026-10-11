import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserSuccess } from '../redux/user/userSlice';
import { apiFetch } from '../utils/apiFetch';
import { FaEnvelopeOpenText } from 'react-icons/fa';

export default function VerifyEmail() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  // Tokens are single-use, so never send the same one twice (e.g. if the
  // effect runs again in development).
  const sentToken = useRef(null);

  useEffect(() => {
    if (sentToken.current === token) return;
    sentToken.current = token;

    const verify = async () => {
      try {
        const res = await apiFetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success === false) {
          setError(data.message);
          setStatus('failed');
          return;
        }
        // Update the signed-in user if it's the account that was verified.
        if (currentUser?._id === data._id) dispatch(updateUserSuccess(data));
        setStatus('verified');
      } catch {
        setError('Something went wrong. Please try again.');
        setStatus('failed');
      }
    };
    verify();
  }, [token, currentUser?._id, dispatch]);

  return (
    <main className='container-page py-16'>
      <div className='card mx-auto max-w-md p-8 text-center'>
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <FaEnvelopeOpenText className='h-5 w-5' aria-hidden='true' />
        </span>
        <h1 className='mt-4 text-2xl font-bold text-slate-900'>Confirm your email</h1>
        {status === 'verifying' && <p className='mt-2 text-slate-600'>Confirming your email address...</p>}
        {status === 'verified' && (
          <>
            <p className='mt-2 text-green-700'>Thanks, your email is confirmed!</p>
            <Link to={currentUser ? '/create-listing' : '/sign-in'} className='btn-primary mt-6'>
              {currentUser ? 'Post a listing' : 'Sign in'}
            </Link>
          </>
        )}
        {status === 'failed' && (
          <p className='mt-2 text-red-700'>
            {error} {currentUser && 'You can request a new link from the banner at the top of the page.'}
          </p>
        )}
      </div>
    </main>
  );
}
