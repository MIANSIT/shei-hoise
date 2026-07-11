"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

export async function selectPathaoStore(
  credentialId: string,
  pathaoStoreId: number,
  pathaoStoreName: string,
): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }

  // Same Pathao store already linked under a different connected account here
  // — picking it again would just create two credentials pointing at the same
  // pickup location, which only confuses "Ship from" selection later.
  const { data: duplicate } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("id")
    .eq("store_id", storeResult.storeId)
    .eq("courier", "pathao")
    .eq("pathao_store_id", pathaoStoreId)
    .neq("id", credentialId)
    .maybeSingle();

  if (duplicate) {
    return {
      success: false,
      error: "This Pathao store is already connected under another account here.",
    };
  }

  const { error } = await supabaseAdmin
    .from("store_courier_credentials")
    .update({
      pathao_store_id: pathaoStoreId,
      pathao_store_name: pathaoStoreName,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId)
    .eq("store_id", storeResult.storeId);

  if (error) {
    console.error("Error selecting Pathao store:", error);
    return { success: false, error: "Failed to save the selected store" };
  }

  return { success: true };
}
