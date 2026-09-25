import { supabaseAdmin } from "@/lib/supabase/admin";
import { OrderStatus } from "@/lib/types/enums";
import { isCourierStatusDelivered } from "@/lib/utils/courierStatus";
import { handleInventoryUpdates, handleRiskAndPurchaseEvent } from "./updateOrder";

/**
 * Pathao/Steadfast's own delivery status (courier_tracking.status) and this
 * store's Order Status (orders.status) are two separate fields — Order
 * Status is what drives COD Settlements, inventory deduction and the
 * Facebook Purchase pixel, and until now it only ever moved to "Delivered"
 * when a staff member picked it manually. Call this right after writing a
 * courier's status update (webhook or manual refresh) to close that gap.
 *
 * Deliberately one-directional: never downgrades an order that's already
 * Delivered, Cancelled or Returned — those stay staff-controlled, since a
 * courier-reported cancellation/return often needs a human decision
 * (refund, reship, etc.) rather than an automatic status flip.
 *
 * Unlike a manual "mark Delivered" click, this can be triggered by a
 * webhook — and webhooks can legitimately deliver the same event twice
 * (retries). So the not-already-terminal check is enforced inside the
 * UPDATE's own WHERE clause, not by a separate read-then-decide step: two
 * near-simultaneous calls would otherwise both read "not yet delivered"
 * before either write lands, and both would run the stock-deducting side
 * effects for one real delivery. Only whichever call's UPDATE actually
 * matches a row proceeds; the other sees zero rows affected and no-ops.
 */
export async function autoMarkOrderDeliveredFromCourier(
  orderId: string,
  courierStatus: string | null | undefined,
): Promise<void> {
  if (!isCourierStatusDelivered(courierStatus)) return;

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: OrderStatus.DELIVERED, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .not(
      "status",
      "in",
      `(${OrderStatus.DELIVERED},${OrderStatus.CANCELLED},${OrderStatus.RETURNED})`,
    )
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("Error auto-marking order delivered from courier status:", updateError);
    return;
  }
  // No row matched the WHERE — already delivered/cancelled/returned, or a
  // concurrent duplicate call already won this exact race. Nothing left to do.
  if (!updatedOrder) return;

  // updatedOrder reflects the row *after* the transition, so its own status
  // already reads "delivered" — the side-effect helpers below short-circuit
  // when updates.status === existingOrder.status, so a placeholder prior
  // status is passed to satisfy that check. The real guarantee that the
  // prior status actually differed came from the UPDATE's WHERE clause
  // above, not from this value.
  const updates = { status: OrderStatus.DELIVERED };
  const priorSnapshot = { ...updatedOrder, status: OrderStatus.PENDING };
  await handleInventoryUpdates(priorSnapshot, updates, orderId);
  await handleRiskAndPurchaseEvent(priorSnapshot, updates, orderId);
}
