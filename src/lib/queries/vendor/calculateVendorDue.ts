// Single source of truth for "how much does this vendor currently owe."
//
// A vendor owes money for goods from the moment they're dispatched
// (confirmed), not only once a settlement marks them sold — so unsettled
// stock the vendor is physically holding counts as owed, valued at the
// price it was last dispatched at (vendor_stock.last_vendor_tp). Settled
// sold items add their reconciled receivable on top, and every payment
// ever recorded (upfront, settlement-linked, or a standalone quick
// payment) reduces it.
export function calculateVendorCurrentDue(params: {
  unsettledStockValue: number;
  totalReceivable: number;
  totalPaid: number;
}): number {
  return params.unsettledStockValue + params.totalReceivable - params.totalPaid;
}
