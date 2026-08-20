export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
