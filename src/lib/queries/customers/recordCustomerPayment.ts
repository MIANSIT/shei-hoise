"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updatePaymentStatus } from "@/lib/queries/orders/updateOrder";
import { PaymentStatus } from "@/lib/types/enums";
import { computeBranchOrderBalances } from "./customerDueMath";
import { BRANCH_SCOPE_ERROR, authorizeForStoreAny, canUseBranch, logActivity } from "@/lib/permissions/server";

export interface RecordCustomerPaymentInput {
  storeId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  orderId?: string | null;
  createdBy?: string | null;
  /**
   * Stores with branches: the branch that took the money. A payment against
   * an order always goes to that order's branch; an unpinned one with no
   * branch goes to the default branch.
   */
  branchId?: string | null;
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

    // Collected from Customer Dues, or taken as part of a new order / Quick Sale.
    const auth = await authorizeForStoreAny(input.storeId, [
      "customers.collect_payment",
      "orders.add",
      "pos.add",
    ]);
    if (!auth.ok) return { success: false, error: auth.error };
    if (input.branchId && !canUseBranch(auth.actor, input.branchId)) {
      return { success: false, error: BRANCH_SCOPE_ERROR };
    }

    const { error: insertError } = await supabaseAdmin.from("customer_payments").insert({
      store_id: input.storeId,
      customer_id: input.customerId,
      order_id: input.orderId || null,
      amount: input.amount,
      payment_date: input.paymentDate,
      payment_method: input.paymentMethod,
      notes: input.notes || null,
      created_by: input.createdBy || auth.actor.userId,
      // Only for unpinned payments — a pinned one takes its order's branch in the database.
      ...(input.branchId && !input.orderId ? { branch_id: input.branchId } : {}),
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    await logActivity(auth.actor, {
      action: "customers.collect_payment",
      entityType: "customer",
      entityId: input.customerId,
      summary: `Collected ৳${input.amount} (${input.paymentMethod})`,
      details: { order_id: input.orderId ?? null, payment_date: input.paymentDate, notes: input.notes ?? null },
    });

    // Branch columns exist once the branch migrations ran; without them every
    // row reads as "no branch" and the math is the store-wide waterfall.
    const [ordersRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("*")
        .eq("store_id", input.storeId)
        .eq("customer_id", input.customerId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("customer_payments")
        .select("*")
        .eq("store_id", input.storeId)
        .eq("customer_id", input.customerId),
    ]);

    type OrderRow = { id: string; total_amount: number; payment_status: string; branch_id?: string | null };
    type PaymentRow = { amount: number; order_id: string | null; branch_id?: string | null };
    const orders = (ordersRes.data ?? []) as OrderRow[];
    const balances = computeBranchOrderBalances(
      orders.map((o) => ({ id: o.id, total_amount: Number(o.total_amount), branch_id: o.branch_id ?? null })),
      (paymentsRes.data ?? []) as PaymentRow[],
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
