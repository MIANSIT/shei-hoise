"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, requireOwner } from "@/lib/permissions/server";

const WITHDRAWAL_METHODS = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"] as const;

export interface RecordOwnerWithdrawalInput {
  storeId: string;
  amount: number;
  paymentMethod: string;
  withdrawalDate: string; // YYYY-MM-DD
  notes?: string;
  /** Stores with branches: the branch the money was taken from. */
  branchId?: string | null;
}

export interface OwnerWithdrawalResult {
  success: boolean;
  error?: string;
}

/**
 * Records money the owner took out of the business for themselves. It is not
 * an expense — it never changes sales or profit, only how much money is left.
 * Owner-only: staff can neither record nor see withdrawals.
 * @returns success, or the reason it failed
 */
export async function recordOwnerWithdrawal(input: RecordOwnerWithdrawalInput): Promise<OwnerWithdrawalResult> {
  try {
    const auth = await requireOwner({ storeId: input.storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    if (!(input.amount > 0)) return { success: false, error: "Amount must be greater than zero" };
    if (!(WITHDRAWAL_METHODS as readonly string[]).includes(input.paymentMethod)) {
      return { success: false, error: "Choose how the money was taken out" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.withdrawalDate)) {
      return { success: false, error: "Choose a valid date" };
    }

    // A store with branches keeps its money branch by branch, so every
    // withdrawal has to say which branch it came out of.
    if (!input.branchId) {
      const { count } = await supabaseAdmin
        .from("store_branches")
        .select("id", { count: "exact", head: true })
        .eq("store_id", input.storeId);
      if ((count ?? 0) > 0) return { success: false, error: "Choose which branch the money was taken from" };
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
      .from("owner_withdrawals")
      .insert({
        store_id: input.storeId,
        branch_id: input.branchId || null,
        amount: input.amount,
        payment_method: input.paymentMethod,
        withdrawal_date: input.withdrawalDate,
        notes: input.notes?.trim() || null,
        created_by: auth.actor.userId,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.withdraw",
      branchId: input.branchId ?? null,
      entityType: "owner_withdrawal",
      entityId: data?.id ?? null,
      summary: `Withdrew ৳${input.amount} (${input.paymentMethod})`,
      details: { withdrawal_date: input.withdrawalDate, notes: input.notes ?? null },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to record withdrawal" };
  }
}

/**
 * Removes a withdrawal that was entered by mistake.
 * @returns success, or the reason it failed
 */
export async function deleteOwnerWithdrawal(storeId: string, withdrawalId: string): Promise<OwnerWithdrawalResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("owner_withdrawals")
      .select("amount, payment_method, withdrawal_date")
      .eq("id", withdrawalId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Withdrawal not found" };

    const { error } = await supabaseAdmin
      .from("owner_withdrawals")
      .delete()
      .eq("id", withdrawalId)
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "money.withdraw_delete",
      entityType: "owner_withdrawal",
      entityId: withdrawalId,
      summary: `Deleted withdrawal of ৳${existing.amount} (${existing.payment_method})`,
      details: existing,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete withdrawal" };
  }
}
