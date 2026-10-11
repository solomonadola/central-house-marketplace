import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompareButton from './CompareButton';
import { renderWithProviders } from '../test/utils';

describe('CompareButton', () => {
  it('adds the listing to the comparison', async () => {
    const { store } = renderWithProviders(<CompareButton listingId='l1' />, { compareIds: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Add to comparison' }));

    expect(store.getState().compare.ids).toEqual(['l1']);
  });

  it('shows as pressed and removes when already selected', async () => {
    const { store } = renderWithProviders(<CompareButton listingId='l1' />, { compareIds: ['l1'] });

    const button = screen.getByRole('button', { name: 'Remove from comparison' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);
    expect(store.getState().compare.ids).toEqual([]);
  });

  it('is disabled when the comparison is full', () => {
    renderWithProviders(<CompareButton listingId='l5' />, { compareIds: ['a', 'b', 'c', 'd'] });
    expect(screen.getByRole('button', { name: 'Comparison is full' })).toBeDisabled();
  });
});
