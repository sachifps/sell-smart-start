
/**
 * Utility functions for formatting values
 */

/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date string to short format (e.g., "Jan 15")
 */
export const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

/**
 * Format a date string to full format (e.g., "Jan 15, 2023")
 */
export const formatFullDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};
