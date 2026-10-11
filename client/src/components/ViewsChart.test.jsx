import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ViewsChart from './ViewsChart';
import { niceMax } from '../utils/chart';

const data = [
  { day: '2026-10-01', views: 4 },
  { day: '2026-10-02', views: 0 },
  { day: '2026-10-03', views: 37 },
  { day: '2026-10-04', views: 12 },
];

describe('niceMax', () => {
  it.each([
    [0, 1],
    [7, 8],
    [37, 40],
    [56, 60],
    [120, 120],
    [130, 160],
    [500, 500],
    [1234, 1600],
  ])('rounds %d up to %d', (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});

describe('ViewsChart', () => {
  it('scales the axis to a clean maximum and labels the peak', () => {
    render(<ViewsChart data={data} />);

    expect(screen.getByText('Views per day, last 4 days')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    // The peak is labeled on the chart (the table repeats it in a cell).
    expect(screen.getByText('37', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows a tooltip on hover and on keyboard focus', () => {
    render(<ViewsChart data={data} />);
    const column = screen.getByLabelText('Oct 4: 12 views');

    fireEvent.pointerEnter(column);
    expect(screen.getByRole('tooltip')).toHaveTextContent('12 views');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sun, Oct 4');
    fireEvent.pointerLeave(column);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText('Oct 1: 4 views'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('4 views');
  });

  it('offers every value as a table', () => {
    render(<ViewsChart data={data} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(6);
    expect(rows.at(-1)).toHaveTextContent('Total53');
  });
});
