"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordCustomerRefund } from "@/lib/queries/customers/recordCustomerRefund";

export interface HandleOrderReturnedInput {
  storeId: string;
  orderId: string;
  customerId: string | null;
  /** existingOrder.payment_status === 'paid', before this transition */
  wasPaid: boolean;
}

// Reverses the money a returned order brought in, in whichever place it was
// recorded:
//  - Paid through the customer dues ledger (customer_payments pinned to this
//    order): a negative ledger line is added. Only payments recorded directly
//    against THIS order are reversed, not pooled/unpinned payments that may
//    have also contributed via the waterfall (customerDueMath.ts's
//    computeOrderBalances) — clawing those back would retroactively un-pay
//    whatever other order they were covering, which is a separate problem.
//  - Paid at the sale (a Quick Sale cash sale, COD collected): a refund entry
//    (customer_refunds) for the product part, on the method it came in by, so
//    Money Overview takes it out of that cash/bKash balance on today's date
//    and keeps the original sale on the day it was received. The owner can
//    delete it if no money was actually given back.
//
// Called from every place that can transition an order to 'returned':
// updateOrder.ts, updateOrderByNumber.ts, bulkUpdateOrders.ts.
export async function handleOrderReturned(input: HandleOrderReturnedInput): Promise<void> {
  try {
    if (!input.wasPaid) return;

    const { data: payments, error } = await supabaseAdmin
      .from("customer_payments")
      .select("amount, payment_method")
      .eq("store_id", input.storeId)
      .eq("order_id", input.orderId);

    if (error) {
      console.error("Error fetching payments for return refund:", error);
      return;
    }

    const pinnedTotal = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    if (pinnedTotal > 0) {
      if (!input.customerId) return;
      // Refund on the method that took the most money in.
      const byMethod = new Map<string, number>();
      for (const p of payments ?? []) {
        if (Number(p.amount) > 0) {
          byMethod.set(p.payment_method, (byMethod.get(p.payment_method) ?? 0) + Number(p.amount));
        }
      }
      const mainMethod = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

      const result = await recordCustomerRefund({
        storeId: input.storeId,
        customerId: input.customerId,
        orderId: input.orderId,
        amount: pinnedTotal,
        notes: "Auto-refund: order returned",
        paymentMethod: mainMethod,
      });

      if (!result.success) {
        console.error("Error recording auto-refund for returned order:", result.error);
      }
      return;
    }

    await recordReturnRefundEntry(input.storeId, input.orderId);
  } catch (error) {
    console.error("Error in handleOrderReturned:", error);
    // Don't throw — the order status update itself already succeeded.
  }
}

const REFUND_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "cod"];

/** Bangladesh date (UTC+6) as YYYY-MM-DD, like the rest of the money pages. */
function bangladeshDate(date: Date): string {
  return new Date(date.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function recordReturnRefundEntry(storeId: string, orderId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from("customer_refunds")
    .select("id")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .limit(1);
  if ((existing ?? []).length > 0) return;

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("branch_id, payment_method, subtotal, discount_amount, additional_charges, order_date, paid_at")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!order) return;

  // Same per-order amount as Sales and Money Overview: delivery and tax are not the shop's money.
  const amount =
    Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0) + Number(order.additional_charges ?? 0);
  if (!(amount > 0)) return;

  const method = String(order.payment_method ?? "").trim().toLowerCase();
  // paid_at is cleared when the order flips to refunded, so this is usually the order date.
  const receivedDate = order.paid_at ? bangladeshDate(new Date(order.paid_at)) : order.order_date;
  if (!receivedDate) return;

  const { error } = await supabaseAdmin.from("customer_refunds").insert({
    store_id: storeId,
    branch_id: order.branch_id ?? null,
    order_id: orderId,
    refund_amount: amount,
    payment_method: REFUND_METHODS.includes(method) ? method : "other",
    refund_date: bangladeshDate(new Date()),
    received_amount: amount,
    received_date: receivedDate,
    notes: "Auto-refund: order returned",
  });
  if (error) console.error("Error recording refund entry for returned order:", error.message);
}
