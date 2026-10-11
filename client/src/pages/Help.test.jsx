import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Help from './Help';
import { renderWithProviders } from '../test/utils';

describe('Help page', () => {
  it('lists the frequently asked questions', () => {
    renderWithProviders(<Help />);

    expect(screen.getByRole('button', { name: /How do I list my home\?/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /What is a holding deposit\?/ })).toBeInTheDocument();
  });

  it('opens an answer when a question is clicked', async () => {
    renderWithProviders(<Help />);

    const question = screen.getByRole('button', { name: /How do viewings work\?/ });
    await userEvent.click(question);

    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/accept or decline/)).toBeInTheDocument();
  });
});
