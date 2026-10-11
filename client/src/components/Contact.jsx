import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

export default function Contact({ listing }) {
  const navigate = useNavigate();
  const [landlord, setLandlord] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLandlord = async () => {
      try {
        const res = await apiFetch(`/api/user/${listing.userRef}`);
        const data = await res.json();
        if (data.success !== false) setLandlord(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchLandlord();
  }, [listing.userRef]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing._id, body }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      navigate(`/messages/${data.conversationId}`);
    } catch {
      setError('Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {landlord && (
        <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
          <label htmlFor='message'>
            Contact <span className='font-semibold'>{landlord.username}</span>{' '}
            for{' '}
            <span className='font-semibold'>{listing.name.toLowerCase()}</span>
          </label>
          <textarea
            name='message'
            id='message'
            rows='2'
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Enter your message here...'
            className='w-full border p-3 rounded-lg'
          ></textarea>
          {error && <p className='text-sm text-red-700'>{error}</p>}
          <button
            type='submit'
            disabled={sending || !message.trim()}
            className='bg-slate-700 text-white text-center p-3 uppercase rounded-lg hover:opacity-95 disabled:opacity-60'
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </>
  );
}
