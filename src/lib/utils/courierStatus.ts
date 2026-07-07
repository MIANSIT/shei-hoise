/** Heuristic since Pathao/Steadfast each return their own free-text status strings (e.g. "Pickup_Cancelled", "cancelled") — no shared enum to match against. */
export function isCourierStatusCancelled(status?: string | null): boolean {
  return !!status && status.toLowerCase().includes("cancel");
}

/**
 * An order's Delivery Courier can't be switched while a real shipment is
 * active (only once it's cancelled), and also can't be switched once the
 * order itself is Delivered or Cancelled — there's nothing left to reship.
 * This only locks the courier picker; the rest of the panel (status badge,
 * Refresh, Track) stays visible so a delivered/cancelled order's shipment
 * history is still checkable.
 */
export function isCourierLocked(
  consignmentId?: string | null,
  courierOrderStatus?: string | null,
  orderStatus?: string | null,
): boolean {
  if (orderStatus === "delivered" || orderStatus === "cancelled") return true;
  return !!consignmentId && !isCourierStatusCancelled(courierOrderStatus);
}
