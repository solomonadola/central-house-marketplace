import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompareBar from './CompareBar';
import { renderWithProviders } from '../test/utils';

describe('CompareBar', () => {
  it('renders nothing when the comparison is empty', () => {
    const { container } = renderWithProviders(<CompareBar />, { compareIds: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the count and a compare link once two are picked', () => {
    renderWithProviders(<CompareBar />, { compareIds: ['a', 'b'] });

    expect(screen.getByText('2 of 4 homes selected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare');
  });

  it('asks for another home when only one is picked', () => {
    renderWithProviders(<CompareBar />, { compareIds: ['a'] });

    expect(screen.getByText('Pick at least 2 to compare')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Compare' })).not.toBeInTheDocument();
  });

  it('removes and clears the selection', async () => {
    const { store } = renderWithProviders(<CompareBar />, { compareIds: ['a', 'b'] });

    await userEvent.click(screen.getByRole('button', { name: 'Remove home 1 from comparison' }));
    expect(store.getState().compare.ids).toEqual(['b']);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(store.getState().compare.ids).toEqual([]);
  });

  it('hides itself on the compare page', () => {
    const { container } = renderWithProviders(<CompareBar />, { compareIds: ['a', 'b'], route: '/compare' });
    expect(container).toBeEmptyDOMElement();
  });
});
