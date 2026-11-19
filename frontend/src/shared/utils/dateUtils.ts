export const getDaysUntilExpiry = (expiryDateString: string): number => {
  const today = new Date();
  // Treat API date-only values as local calendar dates and compare calendar
  // ordinals so daylight-saving changes cannot shift the result by one day.
  const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(expiryDateString)
    ? new Date(`${expiryDateString}T00:00:00`)
    : new Date(expiryDateString);
  if (Number.isNaN(expiryDate.getTime())) return Number.NaN;

  const todayOrdinal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryOrdinal = Date.UTC(
    expiryDate.getFullYear(),
    expiryDate.getMonth(),
    expiryDate.getDate()
  );
  return Math.round((expiryOrdinal - todayOrdinal) / 86_400_000);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(`${dateString}T00:00:00`)
    : new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN');
};

export const generateLotCode = (): string => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `LOT-${yyyy}${mm}${dd}-${randomSuffix}`;
};
