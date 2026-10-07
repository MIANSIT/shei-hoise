"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { dueReminderKey } from "@/lib/utils/dueReminderKey";
import { BRANCH_SCOPE_ERROR, authorizeForStoreAny, canUseBranch } from "@/lib/permissions/server";

const PERMISSIONS = ["customers.collect_payment", "customers.view"] as const;

/**
 * When each customer (per branch) was last reminded, newest first wins.
 * Returns {} if nothing was sent yet — or if the table isn't there yet — so the
 * Customer Dues page works the same either way.
 */
export async function getLastDueReminders(
  storeId: string,
  customerIds: string[],
): Promise<Record<string, string>> {
  const auth = await authorizeForStoreAny(storeId, PERMISSIONS);
  if (!auth.ok || customerIds.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("customer_due_reminders")
    .select("customer_id, branch_id, reminded_at")
    .eq("store_id", auth.storeId)
    .in("customer_id", customerIds)
    .order("reminded_at", { ascending: false });
  if (error || !data) return {};

  const latest: Record<string, string> = {};
  for (const row of data) {
    const key = dueReminderKey(row.customer_id, row.branch_id);
    if (!latest[key]) latest[key] = row.reminded_at;
  }
  return latest;
}

export type RecordDueReminderResult =
  | { success: true; remindedAt: string }
  | { success: false; error: string };

/** Logs that a payment reminder was sent (or copied to send) to this customer. */
export async function recordDueReminder(input: {
  storeId: string;
  customerId: string;
  branchId: string | null;
  amount: number;
  channel: "whatsapp" | "copy";
}): Promise<RecordDueReminderResult> {
  try {
    const auth = await authorizeForStoreAny(input.storeId, PERMISSIONS);
    if (!auth.ok) return { success: false, error: auth.error };
    if (input.branchId && !canUseBranch(auth.actor, input.branchId)) {
      return { success: false, error: BRANCH_SCOPE_ERROR };
    }

    const { data, error } = await supabaseAdmin
      .from("customer_due_reminders")
      .insert({
        store_id: auth.storeId,
        customer_id: input.customerId,
        branch_id: input.branchId,
        amount: input.amount,
        channel: input.channel,
        reminded_by: auth.actor.userId,
      })
      .select("reminded_at")
      .single();
    if (error || !data) return { success: false, error: error?.message ?? "Could not save the reminder" };
    return { success: true, remindedAt: data.reminded_at };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not save the reminder" };
  }
}
