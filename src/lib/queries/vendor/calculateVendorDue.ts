// Single source of truth for "how much does this vendor currently owe."
//
// A vendor owes money for goods from the moment they're dispatched
// (confirmed), not only once a settlement marks them sold — so unsettled
// stock the vendor is physically holding counts as owed, valued at the
// price it was last dispatched at (vendor_stock.last_vendor_tp). Settled
// sold items add their reconciled receivable on top, and every payment
// ever recorded (upfront, settlement-linked, or a standalone quick
// payment) reduces it.
//
// totalDeliveryCostInvoiced (sum of confirmed vendor_orders.delivery_cost)
// is added for the same reason: delivery is a flat per-order charge that's
// owed exactly once and never reduced by a settlement (settlements only
// ever reconcile product quantity/value, never delivery cost). Without it,
// a vendor who prepays delivery in full has that payment reduce totalPaid
// with nothing on the owed side to balance it — current_due comes out
// permanently deflated (even negative) by every delivery charge they've
// ever paid, since that money is gone from the ledger for good but never
// appears as having been owed in the first place. Adding it back in means
// an unpaid delivery charge correctly stays part of what's owed, and a
// paid one exactly cancels out against the payment that covered it.
export function calculateVendorCurrentDue(params: {
  unsettledStockValue: number;
  totalReceivable: number;
  totalDeliveryCostInvoiced: number;
  totalPaid: number;
}): number {
  return (
    params.unsettledStockValue +
    params.totalReceivable +
    params.totalDeliveryCostInvoiced -
    params.totalPaid
  );
}
