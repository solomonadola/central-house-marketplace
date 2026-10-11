import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MortgageCalculator from './MortgageCalculator';

const setField = async (label, value) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

describe('MortgageCalculator', () => {
  it('estimates the monthly cost with the default terms', () => {
    render(<MortgageCalculator price={400000} />);

    // 20% down, 6.5%, 30 years: $2,023 P&I + $367 tax + $125 insurance.
    expect(screen.getByTestId('monthly-total')).toHaveTextContent('$2,514 / month');
    expect(screen.getByText('Principal & interest').nextSibling).toHaveTextContent('$2,023');
    expect(screen.getByText('Paid upfront').nextSibling).toHaveTextContent('$80,000');
  });

  it('updates as the terms change', async () => {
    render(<MortgageCalculator price={400000} />);

    await setField('Interest rate', '6');
    await userEvent.selectOptions(screen.getByLabelText('Loan term'), '15');

    expect(screen.getByText('Total interest over 15 years')).toBeInTheDocument();
    expect(screen.getByText('Principal & interest').nextSibling).toHaveTextContent('$2,700');
  });

  it('says whether the home fits an income', async () => {
    render(<MortgageCalculator price={400000} />);

    await setField('Household income / year', '150000');
    expect(screen.getByRole('status')).toHaveTextContent(/fits your budget/);

    await setField('Household income / year', '60000');
    expect(screen.getByRole('status')).toHaveTextContent(/above your budget/);
  });

  it('shows the yearly pay-down schedule on request', async () => {
    render(<MortgageCalculator price={400000} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show how the loan pays down' }));

    // A header row plus one row per year.
    expect(screen.getAllByRole('row')).toHaveLength(31);
    expect(screen.getAllByRole('row').at(-1)).toHaveTextContent('30');
  });

  it('hides the schedule when there is no loan', async () => {
    render(<MortgageCalculator price={400000} />);
    await setField('Down payment', '100');
    expect(screen.queryByRole('button', { name: /how the loan pays down/ })).not.toBeInTheDocument();
  });
});
