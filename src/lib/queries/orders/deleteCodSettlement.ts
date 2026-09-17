"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/**
 * Undoes a mistakenly-recorded COD settlement — frees every order it covered
 * (cod_settlement_id back to null, so it reappears as unsettled) before
 * deleting the settlement row itself.
 */
export async function deleteCodSettlement(settlementId: string): Promise<void> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) throw new Error(storeResult.error);
  const storeId = storeResult.storeId;

  const { data: settlement, error: fetchError } = await supabaseAdmin
    .from("store_cod_settlements")
    .select("id")
    .eq("id", settlementId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!settlement) throw new Error("Settlement not found");

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
}
