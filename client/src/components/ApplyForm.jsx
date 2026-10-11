import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFileSignature } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { apiFetch } from '../utils/apiFetch';

const emptyForm = (email = '') => ({
  fullName: '',
  email,
  phone: '',
  occupants: '1',
  moveInDate: '',
  income: '',
  message: '',
});

export default function ApplyForm({ listingId, listingType = 'rent' }) {
  const { currentUser } = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(currentUser?.email));
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.id]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Empty optional fields are omitted so the server can default them.
        body: JSON.stringify({
          listingId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          occupants: form.occupants,
          moveInDate: form.moveInDate || undefined,
          income: form.income || undefined,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      setDone(true);
    } catch {
      setError('Could not send your application. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const label = listingType === 'sale' ? 'Apply to buy' : 'Apply to rent';

  if (done) {
    return (
      <p className='text-green-700'>
        Application sent! The owner will be in touch.{' '}
        <Link to='/applications' className='text-blue-800 hover:underline'>
          Track your applications
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <button type='button' onClick={() => setOpen(true)} className='btn-primary'>
        <FaFileSignature aria-hidden='true' /> {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-2 rounded-lg bg-slate-50 p-3'>
      <p className='label'>{label}</p>
      <input
        id='fullName'
        type='text'
        placeholder='Full name'
        aria-label='Full name'
        className='input'
        value={form.fullName}
        onChange={change}
      />
      <input
        id='email'
        type='email'
        placeholder='Email'
        aria-label='Email'
        className='input'
        value={form.email}
        onChange={change}
      />
      <input
        id='phone'
        type='tel'
        placeholder='Phone (optional)'
        aria-label='Phone'
        className='input'
        value={form.phone}
        onChange={change}
      />
      <div className='flex gap-2'>
        <input
          id='occupants'
          type='number'
          min='1'
          max='20'
          placeholder='Occupants'
          aria-label='Occupants'
          className='input'
          value={form.occupants}
          onChange={change}
        />
        <input
          id='moveInDate'
          type='date'
          aria-label='Move in date'
          className='input'
          value={form.moveInDate}
          onChange={change}
        />
      </div>
      <input
        id='income'
        type='number'
        min='0'
        placeholder='Annual income (optional)'
        aria-label='Annual income'
        className='input'
        value={form.income}
        onChange={change}
      />
      <textarea
        id='message'
        rows={3}
        maxLength={1000}
        placeholder='Anything the owner should know? (optional)'
        aria-label='Message'
        className='input'
        value={form.message}
        onChange={change}
      />
      {error && <p className='text-sm text-red-700'>{error}</p>}
      <div className='flex gap-3'>
        <button type='submit' disabled={sending} className='btn-primary'>
          {sending ? 'Sending...' : 'Send application'}
        </button>
        <button type='button' onClick={() => setOpen(false)} className='btn-ghost'>
          Cancel
        </button>
      </div>
    </form>
  );
}
