export function generateInvoiceNumber(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const uid = crypto.randomUUID().replace(/-/g, "").substring(0, 5).toUpperCase();
  return `SUB-${yy}${mm}${dd}-${uid}`;
}
