/** Heuristic since Pathao/Steadfast each return their own free-text status strings (e.g. "Pickup_Cancelled", "cancelled") — no shared enum to match against. */
export function isCourierStatusCancelled(status?: string | null): boolean {
  return !!status && status.toLowerCase().includes("cancel");
}

/**
 * Same free-text-heuristic problem as isCourierStatusCancelled, but for
 * "actually delivered." "partial_delivery" and "delivered_pending_return"
 * both contain "deliver" without meaning the parcel was fully handed over,
 * so those (and any hold/return/cancel/fail status) are excluded first —
 * mirrors the precedence getCourierStatusStyle already uses for coloring.
 */
export function isCourierStatusDelivered(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  if (s.includes("partial") || s.includes("return") || s.includes("cancel") || s.includes("fail") || s.includes("hold")) {
    return false;
  }
  return s.includes("deliver");
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
  if (orderStatus === "delivered" || orderStatus === "cancelled" || orderStatus === "returned") return true;
  return !!consignmentId && !isCourierStatusCancelled(courierOrderStatus);
}
