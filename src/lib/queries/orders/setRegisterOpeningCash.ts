"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRANCH_SCOPE_ERROR, canUseBranch, getAuthorizedStoreId, logActivity } from "@/lib/permissions/server";

/**
 * Sets (or corrects, same day) the drawer's opening cash for a date — one
 * row per store (per branch, for stores with branches) per date, so
 * re-saving the same date just updates it rather than creating a duplicate.
 */
export async function setRegisterOpeningCash(
  dateStr: string,
  amount: number,
  branchId?: string | null,
): Promise<void> {
  const storeResult = await getAuthorizedStoreId("register.add");
  if (!storeResult.ok) throw new Error(storeResult.error);
  if (branchId && !canUseBranch(storeResult.actor, branchId)) throw new Error(BRANCH_SCOPE_ERROR);
  const storeId = storeResult.storeId;

  // The unique key includes a nullable branch, which upsert's onConflict
  // can't target — so update the day's row, or insert it.
  let existing = supabaseAdmin
    .from("store_register_openings")
    .select("id")
    .eq("store_id", storeId)
    .eq("register_date", dateStr);
  existing = branchId ? existing.eq("branch_id", branchId) : existing.is("branch_id", null);
  const { data: row, error: readError } = await existing.maybeSingle();
  if (readError) throw new Error(readError.message);

  const { error } = row
    ? await supabaseAdmin
        .from("store_register_openings")
        .update({ opening_amount: amount, updated_at: new Date().toISOString() })
        .eq("id", row.id)
    : await supabaseAdmin.from("store_register_openings").insert({
        store_id: storeId,
        register_date: dateStr,
        opening_amount: amount,
        ...(branchId ? { branch_id: branchId } : {}),
      });

  if (error) throw new Error(error.message);

  await logActivity(storeResult.actor, {
    action: "register.add",
    entityType: "register",
    branchId: branchId ?? null,
    summary: `Opening cash for ${dateStr}: ৳${amount}`,
  });
}
