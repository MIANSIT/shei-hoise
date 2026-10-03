"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkDeleteWindow, getAuthorizedStoreId, logDeleted } from "@/lib/permissions/server";

/**
 * Undoes a mistakenly-recorded COD settlement — frees every order it covered
 * (cod_settlement_id back to null, so it reappears as unsettled) before
 * deleting the settlement row itself.
 */
export async function deleteCodSettlement(settlementId: string): Promise<void> {
  const storeResult = await getAuthorizedStoreId("cod.delete");
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

  const { data: settlement, error: fetchError } = await supabaseAdmin
    .from("store_cod_settlements")
    .select("*")
    .eq("id", settlementId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!settlement) throw new Error("Settlement not found");

  const tooOld = checkDeleteWindow(storeResult.actor, settlement.created_at);
  if (tooOld) throw new Error(tooOld);

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ cod_settlement_id: null })
    .eq("store_id", storeId)
    .eq("cod_settlement_id", settlementId);

  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabaseAdmin
    .from("store_cod_settlements")
    .delete()
    .eq("id", settlementId)
    .eq("store_id", storeId);

  if (deleteError) throw new Error(deleteError.message);

  await logDeleted(
    storeResult.actor,
    "cod",
    "cod_settlement",
    settlement,
    `Deleted COD settlement of ৳${settlement.total_amount} (${settlement.order_count} orders)`,
  );
}
