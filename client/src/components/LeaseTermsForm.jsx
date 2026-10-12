import { useState } from 'react';
import { periodLabel, toDateInput, upcomingPeriods } from '../utils/rent';

// Owner's form to schedule a rent change and/or move the end date.
export default function LeaseTermsForm({ lease, currentRent, busy, onSave, onCancel }) {
  const months = upcomingPeriods(12);
  const [changeRent, setChangeRent] = useState(true);
  const [monthlyRent, setMonthlyRent] = useState(currentRent);
  const [effectiveFrom, setEffectiveFrom] = useState(months[1]);
  const [endDate, setEndDate] = useState(lease.endDate ? toDateInput(lease.endDate) : '');

  const endChanged = endDate && endDate !== (lease.endDate ? toDateInput(lease.endDate) : '');
  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...(changeRent && { monthlyRent: Number(monthlyRent), effectiveFrom }),
      ...(endChanged && { endDate }),
    });
  };

  return (
    <form onSubmit={submit} className='card flex flex-col gap-4 p-5' aria-label='Change lease terms'>
      <h2 className='text-lg font-semibold text-slate-900'>Change lease terms</h2>

      <label className='flex items-center gap-2 text-sm'>
        <input type='checkbox' checked={changeRent} onChange={(e) => setChangeRent(e.target.checked)} />
        Change the rent
      </label>
      {changeRent && (
        <div className='grid gap-4 sm:grid-cols-2'>
          <label className='flex flex-col gap-1'>
            <span className='label'>New monthly rent ($)</span>
            <input type='number' min='1' required value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} className='input' />
          </label>
          <label className='flex flex-col gap-1'>
            <span className='label'>Starting from</span>
            <select value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className='input'>
              {months.map((period) => (
                <option key={period} value={period}>
                  {periodLabel(period)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className='flex flex-col gap-1 sm:w-1/2'>
        <span className='label'>{lease.endDate ? 'End date' : 'End date (optional)'}</span>
        <input type='date' value={endDate} min={toDateInput(new Date())} onChange={(e) => setEndDate(e.target.value)} className='input' />
      </label>

      <p className='text-sm text-slate-600'>Your tenant is notified. Months already charged keep their amount.</p>

      <div className='flex flex-wrap gap-2'>
        <button disabled={busy || (!changeRent && !endChanged)} className='btn-primary'>
          Save changes
        </button>
        <button type='button' onClick={onCancel} className='btn-secondary'>
          Cancel
        </button>
      </div>
    </form>
  );
}
