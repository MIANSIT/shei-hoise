/**
 * Normalizes a Bangladeshi mobile number to the 11-digit local format
 * (01XXXXXXXXX) that Pathao/Steadfast require — strips spaces, dashes, and
 * an optional +88/88 country code prefix. Returns null if what's left isn't
 * a valid 11-digit, 01-prefixed number, so callers can fail fast with a
 * clear message instead of sending bad input to the courier's live API.
 */
export function normalizeBdPhone(phone: string): string | null {
  const digitsOnly = phone.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  return /^01\d{9}$/.test(digitsOnly) ? digitsOnly : null;
}
