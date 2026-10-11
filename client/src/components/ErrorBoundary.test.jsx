import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';
import { renderWithProviders } from '../test/utils';

function Boom({ shouldThrow }) {
  if (shouldThrow) throw new Error('kaboom');
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('renders children when there is no error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a fallback and can recover', async () => {
    function Toggle() {
      return <Boom shouldThrow />;
    }
    const { rerender } = renderWithProviders(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
