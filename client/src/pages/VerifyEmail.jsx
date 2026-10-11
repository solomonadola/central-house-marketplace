import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserSuccess } from '../redux/user/userSlice';
import { apiFetch } from '../utils/apiFetch';

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
    <div className='p-3 max-w-lg mx-auto text-center'>
      <h1 className='text-3xl font-semibold my-7'>Confirm your email</h1>
      {status === 'verifying' && <p className='text-slate-600'>Confirming your email address...</p>}
      {status === 'verified' && (
        <p>
          <span className='text-green-700'>Thanks, your email is confirmed! </span>
          <Link to={currentUser ? '/create-listing' : '/sign-in'} className='text-blue-700 hover:underline'>
            {currentUser ? 'Post a listing' : 'Sign in'}
          </Link>
        </p>
      )}
      {status === 'failed' && (
        <p className='text-red-700'>
          {error} {currentUser && 'You can request a new link from the banner at the top of the page.'}
        </p>
      )}
    </div>
  );
}
