import { describe, expect, it } from 'vitest';
import { affordablePrice, amortizationByYear, formatDollars, monthlyPayment, mortgageBreakdown } from './mortgage';

describe('monthlyPayment', () => {
  it('matches the standard amortization formula', () => {
    // $300,000 at 6% for 30 years is a well-known $1,798.65.
    expect(monthlyPayment(300000, 6, 30)).toBeCloseTo(1798.65, 2);
    expect(monthlyPayment(200000, 4.5, 15)).toBeCloseTo(1529.99, 2);
  });

  it('splits the loan evenly at 0%', () => {
    expect(monthlyPayment(120000, 0, 10)).toBe(1000);
  });

  it('is zero for no loan or no term', () => {
    expect(monthlyPayment(0, 6, 30)).toBe(0);
    expect(monthlyPayment(100000, 6, 0)).toBe(0);
  });
});

describe('mortgageBreakdown', () => {
  it('adds tax and insurance to the loan payment', () => {
    const b = mortgageBreakdown({
      price: 400000,
      downPaymentPercent: 20,
      annualRatePercent: 6,
      years: 30,
      propertyTaxPercent: 1.2,
      insurancePerYear: 1200,
    });

    expect(b.downPayment).toBe(80000);
    expect(b.loanAmount).toBe(320000);
    expect(b.principalAndInterest).toBeCloseTo(1918.56, 2);
    expect(b.propertyTax).toBe(400);
    expect(b.insurance).toBe(100);
    expect(b.monthlyTotal).toBeCloseTo(2418.56, 2);
    expect(b.totalInterest).toBeCloseTo(b.principalAndInterest * 360 - 320000, 6);
    expect(Math.round(b.totalInterest)).toBe(370682);
  });

  it('caps the down payment at the price', () => {
    const b = mortgageBreakdown({ price: 100000, downPaymentPercent: 150, annualRatePercent: 5, years: 30 });
    expect(b.loanAmount).toBe(0);
    expect(b.principalAndInterest).toBe(0);
    expect(b.totalInterest).toBe(0);
  });
});

describe('affordablePrice', () => {
  it('finds the price whose monthly cost is 28% of income', () => {
    const terms = { downPaymentPercent: 20, annualRatePercent: 6, years: 30, propertyTaxPercent: 1.2, insurancePerYear: 1200 };
    const price = affordablePrice({ annualIncome: 120000, ...terms });

    // Round-trip: that price should cost exactly 28% of monthly income.
    const { monthlyTotal } = mortgageBreakdown({ price, ...terms });
    expect(monthlyTotal).toBeCloseTo((120000 * 0.28) / 12, 6);
  });

  it('is zero when income does not even cover insurance', () => {
    expect(affordablePrice({ annualIncome: 1000, downPaymentPercent: 20, annualRatePercent: 6, years: 30 })).toBe(0);
  });
});

describe('amortizationByYear', () => {
  it('pays the loan down to zero with interest falling each year', () => {
    const rows = amortizationByYear(300000, 6, 30);

    expect(rows).toHaveLength(30);
    expect(rows.at(-1).balance).toBeCloseTo(0, 2);
    expect(rows[0].interest).toBeGreaterThan(rows[1].interest);
    const principal = rows.reduce((sum, r) => sum + r.principal, 0);
    expect(principal).toBeCloseTo(300000, 2);
  });

  it('handles terms that are not whole years', () => {
    expect(amortizationByYear(10000, 5, 1.5).map((r) => r.year)).toEqual([1, 2]);
  });
});

describe('formatDollars', () => {
  it('rounds to whole dollars with separators', () => {
    expect(formatDollars(1918.56)).toBe('$1,919');
  });
});
