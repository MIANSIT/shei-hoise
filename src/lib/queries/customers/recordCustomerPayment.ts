"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updatePaymentStatus } from "@/lib/queries/orders/updateOrder";
import { PaymentStatus } from "@/lib/types/enums";
import { computeOrderBalances } from "./customerDueMath";

export interface RecordCustomerPaymentInput {
  storeId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  orderId?: string | null;
  createdBy?: string | null;
}

export interface RecordCustomerPaymentResult {
  success: boolean;
  error?: string;
}

// Records one payment against a customer's due balance, then re-runs the
// waterfall (computeOrderBalances — same math getCustomerOrderBalances.ts
// uses for reads) and flips payment_status to PAID on any order that's now
// fully covered, via the existing updateOrder.ts path. That's what makes a
// collected due correctly show up as "paid" in the dashboard revenue
// trigger and order-list "finalized" checks, with no changes needed there.
//
// Uses supabaseAdmin for the reconciliation read too (not the anon-key
// client getCustomerOrderBalances.ts uses) — this runs as a server action
// with no browser-authenticated session attached, so an anon-key read
// against customer_payments' RLS-protected table would silently return
// nothing and corrupt the reconciliation.
export async function recordCustomerPayment(
  input: RecordCustomerPaymentInput,
): Promise<RecordCustomerPaymentResult> {
  try {
    if (!(input.amount > 0)) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    const { error: insertError } = await supabaseAdmin.from("customer_payments").insert({
      store_id: input.storeId,
      customer_id: input.customerId,
      order_id: input.orderId || null,
      amount: input.amount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      notes: input.notes || null,
      created_by: input.createdBy || null,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const [ordersRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, total_amount, payment_status")
        .eq("store_id", input.storeId)
        .eq("customer_id", input.customerId),
      supabaseAdmin
        .from("customer_payments")
        .select("amount, order_id")
        .eq("store_id", input.storeId)
        .eq("customer_id", input.customerId),
    ]);

    const orders = ordersRes.data ?? [];
    const balances = computeOrderBalances(
      orders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount) })),
      paymentsRes.data ?? [],
    );
    const balanceByOrderId = new Map(balances.map((b) => [b.order_id, b]));

    const toMarkPaid = orders.filter((o) => {
      const due = balanceByOrderId.get(o.id)?.due_remaining ?? 0;
      return due <= 0.01 && o.payment_status !== PaymentStatus.PAID;
    });

    await Promise.all(toMarkPaid.map((o) => updatePaymentStatus(o.id, PaymentStatus.PAID)));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}
