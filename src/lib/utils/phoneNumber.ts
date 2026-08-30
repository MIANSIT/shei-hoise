// Local numbers are stored as 01XXXXXXXXX; wa.me links (and eventually SMS
// provider APIs) need the full international number with no leading zero
// (880 = Bangladesh).
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
}
