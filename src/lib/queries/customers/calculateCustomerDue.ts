// Single source of truth for "how much does this customer currently owe,"
// mirroring calculateVendorDue.ts's role for vendor dues — due is always
// derived from total vs. paid, never stored as its own mutable column.
export function calculateCustomerCurrentDue(params: {
  totalAmount: number;
  totalPaid: number;
}): number {
  return params.totalAmount - params.totalPaid;
}
