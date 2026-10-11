import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AmenitiesPicker from './AmenitiesPicker';
import { renderWithProviders } from '../test/utils';

describe('AmenitiesPicker', () => {
  it('checks the selected amenities', () => {
    renderWithProviders(<AmenitiesPicker value={['wifi', 'garden']} onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Garden' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pool' })).not.toBeChecked();
  });

  it('adds an amenity when checked', async () => {
    const onChange = vi.fn();
    renderWithProviders(<AmenitiesPicker value={['wifi']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Garden' }));

    expect(onChange).toHaveBeenCalledWith(['wifi', 'garden']);
  });

  it('removes an amenity when unchecked', async () => {
    const onChange = vi.fn();
    renderWithProviders(<AmenitiesPicker value={['wifi', 'garden']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));

    expect(onChange).toHaveBeenCalledWith(['garden']);
  });
});
