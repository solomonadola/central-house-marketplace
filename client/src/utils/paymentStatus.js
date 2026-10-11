// Display metadata for each payment status.
export const PAYMENT_STATUS = {
  pending: { label: 'Pending', tone: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', tone: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refunded', tone: 'bg-sky-100 text-sky-800' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-200 text-slate-700' },
};

export const paymentStatus = (status) =>
  PAYMENT_STATUS[status] ?? { label: status, tone: 'bg-slate-200 text-slate-700' };

export const formatMoney = (amount, currency = 'USD') => {
  const value = Number(amount).toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${value} ${currency}`;
};
