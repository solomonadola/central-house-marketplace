import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating, { StarInput } from './StarRating';

describe('StarRating', () => {
  it('describes the rating for screen readers', () => {
    render(<StarRating value={4.33} />);
    expect(screen.getByRole('img', { name: 'Rated 4.33 out of 5' })).toBeInTheDocument();
  });

  it('always renders five stars', () => {
    const { container } = render(<StarRating value={2.5} />);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });
});

describe('StarInput', () => {
  it('reports the chosen rating', async () => {
    const onChange = vi.fn();
    render(<StarInput value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marks the current rating as checked', () => {
    render(<StarInput value={3} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1 star' })).toHaveAttribute('aria-checked', 'false');
  });
});
