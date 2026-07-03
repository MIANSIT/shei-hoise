// Order number: PAWF-260618-550E8 (first4 of slug + YYMMDD + first5 of UUID)
export function generateCustomerOrderNumber(storeSlug: string): string {
  const prefix = storeSlug.replace(/-/g, "").substring(0, 4).toUpperCase();
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const uid = crypto.randomUUID().replace(/-/g, "").substring(0, 5).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${uid}`;
}
