"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny, logActivity, requireOwner } from "@/lib/permissions/server";

const REFUND_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "cod", "other"] as const;

export interface RecordCustomerRefundEntryInput {
  storeId: string;
  /** Product money handed back (delivery and tax are not counted). */
  amount: number;
  paymentMethod: string;
  refundDate: string; // YYYY-MM-DD
  notes?: string;
  /** Stores with branches: the branch the money was paid out of. */
  branchId?: string | null;
}

export interface CustomerRefundEntryResult {
  success: boolean;
  error?: string;
}

/**
 * Records money handed back to a customer. Refunds from a returned order are
 * created automatically (see handleOrderReturned); this is for any other
 * refund, such as a part-refund or one made later.
 * @returns success, or the reason it failed
 */
export async function recordCustomerRefundEntry(
  input: RecordCustomerRefundEntryInput,
): Promise<CustomerRefundEntryResult> {
  try {
    const auth = await authorizeForStoreAny(input.storeId, [
      "orders.change_status",
      "orders.edit",
      "customers.collect_payment",
    ]);
    if (!auth.ok) return { success: false, error: auth.error };

    if (!(input.amount > 0)) return { success: false, error: "Amount must be greater than zero" };
    if (!(REFUND_METHODS as readonly string[]).includes(input.paymentMethod)) {
      return { success: false, error: "Choose how the money was paid back" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.refundDate)) {
      return { success: false, error: "Choose a valid date" };
    }

    // A store with branches keeps its money branch by branch.
    if (!input.branchId) {
      const { count } = await supabaseAdmin
        .from("store_branches")
        .select("id", { count: "exact", head: true })
        .eq("store_id", input.storeId);
      if ((count ?? 0) > 0) return { success: false, error: "Choose which branch the money was paid from" };
    }
    // branchId comes from the browser — it must be one of this store's own branches.
    if (input.branchId) {
      const { data: branch } = await supabaseAdmin
        .from("store_branches")
        .select("id")
        .eq("id", input.branchId)
        .eq("store_id", input.storeId)
        .maybeSingle();
      if (!branch) return { success: false, error: "Branch not found" };
    }

    const { data, error } = await supabaseAdmin
      .from("customer_refunds")
      .insert({
        store_id: input.storeId,
        branch_id: input.branchId || null,
        refund_amount: input.amount,
        payment_method: input.paymentMethod,
        refund_date: input.refundDate,
        notes: input.notes?.trim() || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.refund",
      branchId: input.branchId ?? null,
      entityType: "customer_refund",
      entityId: data?.id ?? null,
      summary: `Refunded ৳${input.amount} (${input.paymentMethod})`,
      details: { refund_date: input.refundDate, notes: input.notes ?? null },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to record refund" };
  }
}

/**
 * Removes a refund that was entered by mistake, or an automatic one for a
 * return where no money was actually given back. Owner-only, because it
 * changes the money figures.
 * @returns success, or the reason it failed
 */
export async function deleteCustomerRefundEntry(
  storeId: string,
  refundId: string,
): Promise<CustomerRefundEntryResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("customer_refunds")
      .select("refund_amount, payment_method, refund_date")
      .eq("id", refundId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Refund not found" };

    const { error } = await supabaseAdmin
      .from("customer_refunds")
      .delete()
      .eq("id", refundId)
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.refund_delete",
      entityType: "customer_refund",
      entityId: refundId,
      summary: `Deleted refund of ৳${existing.refund_amount} (${existing.payment_method})`,
      details: existing,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete refund" };
  }
}
