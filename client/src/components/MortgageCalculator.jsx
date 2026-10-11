import { useMemo, useState } from 'react';
import { FaCalculator } from 'react-icons/fa';
import { affordablePrice, amortizationByYear, formatDollars, mortgageBreakdown } from '../utils/mortgage';

const TERMS = [15, 20, 30];

function NumberField({ id, label, value, onChange, suffix, step = 'any', min = 0, max }) {
  return (
    <div>
      <label htmlFor={id} className='label'>
        {label}
      </label>
      <div className='relative'>
        <input
          id={id}
          type='number'
          inputMode='decimal'
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400'>{suffix}</span>}
      </div>
    </div>
  );
}

// Estimates the monthly cost of buying a listing, and whether it fits a
// given income. Estimates only; the copy says so.
export default function MortgageCalculator({ price }) {
  const [downPaymentPercent, setDown] = useState('20');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState(30);
  const [taxPercent, setTax] = useState('1.1');
  const [insurance, setInsurance] = useState('1500');
  const [income, setIncome] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const terms = {
    downPaymentPercent: num(downPaymentPercent),
    annualRatePercent: num(rate),
    years,
    propertyTaxPercent: num(taxPercent),
    insurancePerYear: num(insurance),
  };

  const breakdown = mortgageBreakdown({ price, ...terms });
  const maxPrice = income ? affordablePrice({ annualIncome: num(income), ...terms }) : null;
  const schedule = useMemo(
    () => (showSchedule ? amortizationByYear(breakdown.loanAmount, terms.annualRatePercent, years) : []),
    [showSchedule, breakdown.loanAmount, terms.annualRatePercent, years]
  );

  const parts = [
    ['Principal & interest', breakdown.principalAndInterest],
    ['Property tax', breakdown.propertyTax],
    ['Home insurance', breakdown.insurance],
  ];

  return (
    <section aria-labelledby='mortgage-title' className='card p-5'>
      <h2 id='mortgage-title' className='flex items-center gap-2 text-xl font-semibold text-slate-900'>
        <FaCalculator className='text-brand-600' aria-hidden='true' /> Mortgage calculator
      </h2>

      <div className='mt-4 grid gap-6 md:grid-cols-2'>
        <div className='grid grid-cols-2 gap-3'>
          <NumberField id='mortgage-down' label='Down payment' value={downPaymentPercent} onChange={setDown} suffix='%' max={100} />
          <NumberField id='mortgage-rate' label='Interest rate' value={rate} onChange={setRate} suffix='%' step='0.05' max={25} />
          <div>
            <label htmlFor='mortgage-term' className='label'>
              Loan term
            </label>
            <select id='mortgage-term' value={years} onChange={(e) => setYears(Number(e.target.value))} className='input'>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t} years
                </option>
              ))}
            </select>
          </div>
          <NumberField id='mortgage-tax' label='Property tax / year' value={taxPercent} onChange={setTax} suffix='%' step='0.05' max={10} />
          <div className='col-span-2'>
            <NumberField id='mortgage-insurance' label='Insurance / year' value={insurance} onChange={setInsurance} suffix='$' step='50' />
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='rounded-xl bg-brand-50 p-4'>
            <p className='text-sm text-brand-800'>Estimated monthly cost</p>
            <p className='text-3xl font-bold text-slate-900' data-testid='monthly-total'>
              {formatDollars(breakdown.monthlyTotal)}
              <span className='text-base font-medium text-slate-500'> / month</span>
            </p>
          </div>
          <dl className='divide-y divide-slate-100 text-sm'>
            {parts.map(([label, amount]) => (
              <div key={label} className='flex justify-between py-1.5'>
                <dt className='text-slate-600'>{label}</dt>
                <dd className='font-medium text-slate-900'>{formatDollars(amount)}</dd>
              </div>
            ))}
            <div className='flex justify-between py-1.5'>
              <dt className='text-slate-600'>Paid upfront</dt>
              <dd className='font-medium text-slate-900'>{formatDollars(breakdown.downPayment)}</dd>
            </div>
            <div className='flex justify-between py-1.5'>
              <dt className='text-slate-600'>Total interest over {years} years</dt>
              <dd className='font-medium text-slate-900'>{formatDollars(breakdown.totalInterest)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className='mt-6 border-t border-slate-100 pt-4'>
        <h3 className='font-semibold text-slate-900'>Can I afford it?</h3>
        <div className='mt-2 grid items-end gap-3 sm:grid-cols-2'>
          <NumberField id='mortgage-income' label='Household income / year' value={income} onChange={setIncome} suffix='$' step='1000' />
          {maxPrice !== null && (
            <p className={`rounded-lg p-3 text-sm ${maxPrice >= price ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`} role='status'>
              {maxPrice >= price
                ? `This home fits your budget. You could afford up to about ${formatDollars(maxPrice)}.`
                : `This home is above your budget. You could afford up to about ${formatDollars(maxPrice)}.`}
            </p>
          )}
        </div>
        <p className='mt-2 text-xs text-slate-500'>
          Based on keeping housing costs under 28% of gross income. Estimates only, not financial advice.
        </p>
      </div>

      {breakdown.loanAmount > 0 && (
        <div className='mt-4'>
          <button type='button' onClick={() => setShowSchedule((s) => !s)} className='text-sm font-semibold text-brand-700' aria-expanded={showSchedule}>
            {showSchedule ? 'Hide' : 'Show'} how the loan pays down
          </button>
          {showSchedule && (
            <div className='mt-3 max-h-72 overflow-y-auto'>
              <table className='w-full text-right text-sm tabular-nums'>
                <thead className='sticky top-0 bg-white text-slate-500'>
                  <tr>
                    <th className='py-1 text-left font-normal'>Year</th>
                    <th className='py-1 font-normal'>Principal</th>
                    <th className='py-1 font-normal'>Interest</th>
                    <th className='py-1 font-normal'>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.year} className='border-t border-slate-100'>
                      <td className='py-1 text-left'>{row.year}</td>
                      <td className='py-1'>{formatDollars(row.principal)}</td>
                      <td className='py-1'>{formatDollars(row.interest)}</td>
                      <td className='py-1'>{formatDollars(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
