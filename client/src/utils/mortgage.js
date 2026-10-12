// Mortgage maths for the calculator on for-sale listings. All amounts are
// in dollars; rates are annual percentages (6.5 means 6.5%).

// Monthly principal-and-interest payment for a fixed-rate loan, using the
// standard amortization formula. A 0% rate just splits the loan evenly.
export const monthlyPayment = (loanAmount, annualRatePercent, years) => {
  const months = Math.round(years * 12);
  if (loanAmount <= 0 || months <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return loanAmount / months;
  return (loanAmount * r) / (1 - (1 + r) ** -months);
};

// The full monthly cost of owning: loan payment plus estimated property tax
// and home insurance, with the totals over the life of the loan.
export const mortgageBreakdown = ({
  price,
  downPaymentPercent,
  annualRatePercent,
  years,
  propertyTaxPercent = 1.1,
  insurancePerYear = 1500,
}) => {
  const downPayment = Math.max(0, Math.min(price, (price * downPaymentPercent) / 100));
  const loanAmount = price - downPayment;
  const principalAndInterest = monthlyPayment(loanAmount, annualRatePercent, years);
  const propertyTax = (price * propertyTaxPercent) / 100 / 12;
  const insurance = insurancePerYear / 12;
  const totalPaid = principalAndInterest * Math.round(years * 12);

  return {
    downPayment,
    loanAmount,
    principalAndInterest,
    propertyTax,
    insurance,
    monthlyTotal: principalAndInterest + propertyTax + insurance,
    totalInterest: Math.max(0, totalPaid - loanAmount),
    totalPaid,
  };
};

// Lenders commonly cap housing costs at 28% of gross income. Returns the
// highest home price whose monthly cost fits that, for the same loan terms.
export const HOUSING_COST_RATIO = 0.28;

export const affordablePrice = ({
  annualIncome,
  downPaymentPercent,
  annualRatePercent,
  years,
  propertyTaxPercent = 1.1,
  insurancePerYear = 1500,
}) => {
  const budget = (annualIncome * HOUSING_COST_RATIO) / 12 - insurancePerYear / 12;
  if (budget <= 0) return 0;

  // Monthly cost per dollar of price is linear in price, so solve directly:
  // cost(price) = price * (loanShare * paymentPerDollar + taxPerDollar).
  const loanShare = 1 - Math.min(100, Math.max(0, downPaymentPercent)) / 100;
  const paymentPerDollar = monthlyPayment(1, annualRatePercent, years);
  const taxPerDollar = propertyTaxPercent / 100 / 12;
  const costPerDollar = loanShare * paymentPerDollar + taxPerDollar;
  return costPerDollar > 0 ? budget / costPerDollar : 0;
};

// One row per year: how much of the loan is left and how much interest
// that year cost. Used for the "how the loan pays down" table.
export const amortizationByYear = (loanAmount, annualRatePercent, years) => {
  const months = Math.round(years * 12);
  const r = annualRatePercent / 100 / 12;
  const payment = monthlyPayment(loanAmount, annualRatePercent, years);
  const rows = [];
  let balance = loanAmount;
  let interestThisYear = 0;
  let principalThisYear = 0;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * r;
    const principal = Math.min(balance, payment - interest);
    balance -= principal;
    interestThisYear += interest;
    principalThisYear += principal;
    if (month % 12 === 0 || month === months) {
      rows.push({
        year: Math.ceil(month / 12),
        interest: interestThisYear,
        principal: principalThisYear,
        balance: Math.max(0, balance),
      });
      interestThisYear = 0;
      principalThisYear = 0;
    }
  }
  return rows;
};

export const formatDollars = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
