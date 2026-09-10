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

// Reverses a returned order's tracked due-sale payments in the customer
// dues ledger, if any. Only reverses payments recorded directly against
// THIS order (customer_payments.order_id = orderId), not any pooled/
// unpinned payments that may have also contributed via the waterfall
// (customerDueMath.ts's computeOrderBalances) — clawing those back would
// retroactively un-pay whatever other order they were covering, which is a
// separate problem this isn't trying to solve.
//
// A paid order with no ledger trail at all (COD collected at the door, or a
// non-due Quick Sale cash sale) correctly no-ops here — there's nothing to
// reverse in a ledger that order never touched; the payment_status ->
// refunded flip (done by the caller, alongside this) is what excludes it
// from the dashboard's revenue math.
//
// Called from every place that can transition an order to 'returned':
// updateOrder.ts, updateOrderByNumber.ts, bulkUpdateOrders.ts.
export async function handleOrderReturned(input: HandleOrderReturnedInput): Promise<void> {
  try {
    if (!input.wasPaid || !input.customerId) return;

    const { data: payments, error } = await supabaseAdmin
      .from("customer_payments")
      .select("amount")
      .eq("order_id", input.orderId);

    if (error) {
      console.error("Error fetching payments for return refund:", error);
      return;
    }

    const pinnedTotal = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    if (pinnedTotal <= 0) return;

    const result = await recordCustomerRefund({
      storeId: input.storeId,
      customerId: input.customerId,
      orderId: input.orderId,
      amount: pinnedTotal,
      notes: "Auto-refund: order returned",
    });

    if (!result.success) {
      console.error("Error recording auto-refund for returned order:", result.error);
    }
  } catch (error) {
    console.error("Error in handleOrderReturned:", error);
    // Don't throw — the order status update itself already succeeded.
  }
}
