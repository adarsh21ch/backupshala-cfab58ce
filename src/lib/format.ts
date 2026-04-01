export const formatINR = (amount: number): string => {
export const formatPrice = formatINR;
// Legacy alias
export const formatPriceLegacy = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const timeAgo = (date: string): string => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const CATEGORIES = [
  'Video Editing',
  'Content Creation',
  'Personal Branding',
  'Sales & Communication',
  'Freelancing',
  'Business Skills',
  'Digital Marketing',
  'Other',
] as const;
