/**
 * Format a number as OMR currency with 3 decimal places.
 * Example: formatOMR(1.5) → "OMR 1.500"
 */
export function formatOMR(amount: number): string {
  return `OMR ${Math.abs(amount).toFixed(3)}`;
}

/**
 * Format with sign for negative values
 */
export function formatOMRSigned(amount: number): string {
  const prefix = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${prefix}OMR ${Math.abs(amount).toFixed(3)}`;
}

export const CURRENCY_SYMBOL = "OMR";
export const CURRENCY_DECIMALS = 3;
