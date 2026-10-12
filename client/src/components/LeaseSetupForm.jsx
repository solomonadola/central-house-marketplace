import { useState } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { ordinal, toDateInput } from '../utils/rent';

const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

// Lets an owner turn an approved rental application into a lease. The
// candidate comes from GET /api/leases/candidates.
export default function LeaseSetupForm({ candidate, onCreated, onCancel }) {
  const [form, setForm] = useState({
    monthlyRent: candidate.suggestedRent ?? '',
    dueDay: 1,
    startDate: toDateInput(candidate.moveInDate ?? new Date()),
    endDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: candidate.applicationId, ...form }),
      });
      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        return;
      }
      onCreated(data);
    } catch {
      setError('Could not set up the lease. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='card flex flex-col gap-4 p-5' aria-label='Set up lease'>
      <div>
        <h2 className='text-lg font-semibold text-slate-900'>Set up a lease</h2>
        <p className='text-sm text-slate-600'>
          {candidate.tenant?.username ?? 'Tenant'} · {candidate.listing.name}
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <label className='flex flex-col gap-1'>
          <span className='label'>Monthly rent ($)</span>
          <input type='number' min='1' required value={form.monthlyRent} onChange={set('monthlyRent')} className='input' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='label'>Rent is due on the</span>
          <select value={form.dueDay} onChange={set('dueDay')} className='input'>
            {DUE_DAYS.map((day) => (
              <option key={day} value={day}>
                {ordinal(day)} of the month
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col gap-1'>
          <span className='label'>Start date</span>
          <input type='date' required value={form.startDate} onChange={set('startDate')} className='input' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='label'>End date (optional)</span>
          <input type='date' value={form.endDate} min={form.startDate} onChange={set('endDate')} className='input' />
        </label>
      </div>

      <label className='flex flex-col gap-1'>
        <span className='label'>Notes for the tenant (optional)</span>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          maxLength={1000}
          placeholder='e.g. Rent goes to the account in your welcome email.'
          className='input'
        />
      </label>

      {error && (
        <p className='text-sm text-red-700' role='alert'>
          {error}
        </p>
      )}

      <div className='flex flex-wrap gap-2'>
        <button disabled={saving} className='btn-primary'>
          {saving ? 'Saving...' : 'Create lease'}
        </button>
        <button type='button' onClick={onCancel} className='btn-secondary'>
          Cancel
        </button>
      </div>
    </form>
  );
}
