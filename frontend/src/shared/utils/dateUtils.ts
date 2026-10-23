export const getDaysUntilExpiry = (expiryDateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset giờ để so sánh theo ngày
  
  const expiryDate = new Date(expiryDateString);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
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
