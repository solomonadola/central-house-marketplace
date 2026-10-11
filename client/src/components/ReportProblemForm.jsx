import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import { CATEGORY_LABELS, URGENCY_LABELS } from '../utils/maintenance';

// Lets a tenant report a problem with one of the homes they rent.
export default function ReportProblemForm({ listings, onCancel }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    listingId: listings[0]?._id ?? '',
    title: '',
    description: '',
    category: 'plumbing',
    urgency: 'normal',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      navigate(`/maintenance/${data._id}`);
    } catch {
      setError('Could not send your report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className='card grid gap-4 p-5 sm:grid-cols-2'>
      <div className='sm:col-span-2'>
        <label htmlFor='problem-home' className='label'>
          Home
        </label>
        <select id='problem-home' value={form.listingId} onChange={set('listingId')} className='input'>
          {listings.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className='sm:col-span-2'>
        <label htmlFor='problem-title' className='label'>
          What&apos;s wrong?
        </label>
        <input
          id='problem-title'
          value={form.title}
          onChange={set('title')}
          maxLength={100}
          placeholder='e.g. Kitchen tap is leaking'
          className='input'
        />
      </div>
      <div>
        <label htmlFor='problem-category' className='label'>
          Category
        </label>
        <select id='problem-category' value={form.category} onChange={set('category')} className='input'>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor='problem-urgency' className='label'>
          Urgency
        </label>
        <select id='problem-urgency' value={form.urgency} onChange={set('urgency')} className='input'>
          {Object.entries(URGENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className='sm:col-span-2'>
        <label htmlFor='problem-description' className='label'>
          Details (optional)
        </label>
        <textarea
          id='problem-description'
          value={form.description}
          onChange={set('description')}
          rows={4}
          maxLength={2000}
          placeholder='When did it start? Anything you have tried?'
          className='input'
        />
      </div>
      {error && <p className='text-sm text-red-700 sm:col-span-2'>{error}</p>}
      <div className='flex gap-2 sm:col-span-2'>
        <button disabled={saving || form.title.trim().length < 5} className='btn-primary'>
          {saving ? 'Sending...' : 'Send report'}
        </button>
        <button type='button' onClick={onCancel} className='btn-ghost'>
          Cancel
        </button>
      </div>
    </form>
  );
}
