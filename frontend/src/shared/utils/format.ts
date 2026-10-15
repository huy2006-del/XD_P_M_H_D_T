export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number, digits = 0): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
