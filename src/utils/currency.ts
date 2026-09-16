/**
 * Format a number as Indian currency (₹)
 * Examples: 25000 → ₹25,000  |  1500.5 → ₹1,500.50
 */
export const formatCurrency = (amount: number): string => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  // Indian number formatting: 1,23,456.78
  const parts = abs.toFixed(2).split('.');
  const whole = parts[0];
  const decimal = parts[1];

  // Apply Indian comma grouping
  let formatted = '';
  if (whole.length <= 3) {
    formatted = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    // Group the rest in pairs from right
    const pairs = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${pairs},${last3}`;
  }

  // Drop decimal if .00
  const result = decimal === '00' ? formatted : `${formatted}.${decimal}`;
  return `${isNegative ? '-' : ''}₹${result}`;
};

/**
 * Format a number as compact currency
 * Examples: 125000 → ₹1.25L  |  2500000 → ₹25L  |  500 → ₹500
 */
export const formatCompactCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
};

/**
 * Format amount for display without ₹ sign (for input fields)
 */
export const formatAmountRaw = (amount: number): string => {
  if (amount === 0) return '';
  return amount.toFixed(2).replace(/\.00$/, '');
};

/**
 * Parse a currency string back to number
 */
export const parseCurrencyInput = (input: string): number => {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};
