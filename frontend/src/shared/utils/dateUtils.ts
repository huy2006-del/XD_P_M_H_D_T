export const getDaysUntilExpiry = (expiryDateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset giờ để so sánh theo ngày

  // LocalDate từ backend có dạng YYYY-MM-DD; parse thủ công để tránh lệch ngày do UTC.
  const datePart = expiryDateString.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  const expiryDate = new Date(year, month - 1, day);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('vi-VN');
};

export const toLocalDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateLotCode = (): string => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `LOT-${yyyy}${mm}${dd}-${randomSuffix}`;
};
