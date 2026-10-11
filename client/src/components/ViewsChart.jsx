import { useState } from 'react';
import { niceMax } from '../utils/chart';

// Validated against the white surface (lightness, chroma, 3:1 contrast).
const BAR_COLOR = '#2a78d6';
const CHART_HEIGHT = 160;

const formatDay = (day, options) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });

// Daily views as columns: one series, so no legend; the title names it.
// Each column has its own hover/focus tooltip, and the numbers are also
// available as a table.
export default function ViewsChart({ data }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.views)));
  const peak = data.reduce((best, d) => (d.views > best.views ? d : best), data[0]);
  const total = data.reduce((sum, d) => sum + d.views, 0);

  return (
    <figure className='flex flex-col gap-2'>
      <figcaption className='text-sm text-slate-600'>
        Views per day, last {data.length} days
      </figcaption>
      <div className='flex gap-2'>
        {/* Y axis: clean ticks only, in muted text. */}
        <div className='flex flex-col justify-between text-xs text-slate-500 text-right' style={{ height: CHART_HEIGHT }}>
          <span>{max.toLocaleString('en-US')}</span>
          <span>{(max / 2).toLocaleString('en-US')}</span>
          <span>0</span>
        </div>
        <div className='relative flex-1 min-w-0'>
          {/* Recessive hairline gridlines. */}
          {[0, 0.5, 1].map((f) => (
            <div key={f} className='absolute left-0 right-0 border-t border-slate-200' style={{ bottom: f * CHART_HEIGHT }} />
          ))}
          <div className='relative flex items-end gap-[2px]' style={{ height: CHART_HEIGHT }}>
            {data.map((d) => {
              const height = (d.views / max) * CHART_HEIGHT;
              const isActive = active?.day === d.day;
              return (
                <div
                  key={d.day}
                  // The whole column slot is the hit target, not just the bar.
                  className='relative flex-1 h-full flex items-end justify-center outline-none focus-visible:bg-slate-100'
                  tabIndex={0}
                  aria-label={`${formatDay(d.day, { month: 'short', day: 'numeric' })}: ${d.views} views`}
                  onPointerEnter={() => setActive(d)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(d)}
                  onBlur={() => setActive(null)}
                >
                  <div
                    className='w-full max-w-[24px] rounded-t transition-opacity'
                    style={{
                      height: d.views > 0 ? Math.max(height, 2) : 0,
                      background: BAR_COLOR,
                      opacity: active && !isActive ? 0.55 : 1,
                    }}
                  />
                  {d.day === peak.day && d.views > 0 && !active && (
                    <span className='absolute text-xs text-slate-700 font-semibold' style={{ bottom: height + 2 }}>
                      {d.views}
                    </span>
                  )}
                  {isActive && (
                    <div
                      role='tooltip'
                      // Sits just above the hovered bar rather than the chart top.
                      style={{ bottom: height + 6 }}
                      className='absolute z-10 whitespace-nowrap rounded-md bg-white border shadow px-2 py-1 text-xs pointer-events-none'
                    >
                      <span className='block font-semibold text-slate-900 text-sm'>{d.views.toLocaleString('en-US')} views</span>
                      <span className='text-slate-500'>{formatDay(d.day, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className='flex justify-between text-xs text-slate-500 mt-1'>
            <span>{formatDay(data[0].day, { month: 'short', day: 'numeric' })}</span>
            <span>{formatDay(data.at(-1).day, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
      <details className='text-sm'>
        <summary className='cursor-pointer text-slate-600'>Show as table</summary>
        <table className='mt-2 text-left'>
          <thead>
            <tr className='text-slate-500'>
              <th className='pr-6 font-normal'>Day</th>
              <th className='font-normal text-right'>Views</th>
            </tr>
          </thead>
          <tbody className='tabular-nums'>
            {data.map((d) => (
              <tr key={d.day}>
                <td className='pr-6'>{formatDay(d.day, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td className='text-right'>{d.views}</td>
              </tr>
            ))}
            <tr className='font-semibold border-t'>
              <td className='pr-6'>Total</td>
              <td className='text-right'>{total}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </figure>
  );
}
