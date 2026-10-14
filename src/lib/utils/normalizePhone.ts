/**
 * Brings any Bangladeshi phone shape to the local 01XXXXXXXXX form, matching
 * the normalize_phone() SQL function: 01712-345678, 8801712345678,
 * +8801712345678 and 1712345678 all become 01712345678. Anything else is
 * reduced to its digits.
 * @param phone - Phone as typed
 * @returns Normalized digits, or null when no digits are present
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (/^8801\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^1\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}
