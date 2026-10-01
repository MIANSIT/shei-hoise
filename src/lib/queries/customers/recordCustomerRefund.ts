"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny } from "@/lib/permissions/server";

export interface RecordCustomerRefundInput {
  storeId: string;
  customerId: string;
  orderId: string;
  amount: number; // positive; stored as a negative ledger entry
  notes?: string;
  createdBy?: string | null;
}

export interface RecordCustomerRefundResult {
  success: boolean;
  error?: string;
}

// Reverses money already recorded as collected against a specific order (via
// recordCustomerPayment) when that order is returned — inserted as a
// negative customer_payments row, pinned to the order, so the ledger's
// "total_amount - sum(payments)" due math (computeOrderBalances in
// customerDueMath.ts) naturally reflects it with no other changes needed.
// See handleOrderReturned.ts for why the caller only ever passes the sum of
// payments already pinned to this order, not any pool-drawn contribution.
export async function recordCustomerRefund(
  input: RecordCustomerRefundInput,
): Promise<RecordCustomerRefundResult> {
  try {
    if (!(input.amount > 0)) {
      return { success: false, error: "Refund amount must be greater than zero" };
    }

    // Runs when an order is marked returned (handleOrderReturned).
    const auth = await authorizeForStoreAny(input.storeId, [
      "orders.change_status",
      "orders.edit",
      "customers.collect_payment",
    ]);
    if (!auth.ok) return { success: false, error: auth.error };

    const { error } = await supabaseAdmin.from("customer_payments").insert({
      store_id: input.storeId,
      customer_id: input.customerId,
      order_id: input.orderId,
      amount: -input.amount,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "refund",
      notes: input.notes || "Refund for returned order",
      created_by: input.createdBy || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record refund",
    };
  }
}
