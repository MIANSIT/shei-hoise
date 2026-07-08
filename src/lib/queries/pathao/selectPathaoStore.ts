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
