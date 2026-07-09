"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";

/** Delete-by-id is identical regardless of which courier the account belongs to. */
export async function disconnectCourierAccount(
  credentialId: string,
): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }

  const { error } = await supabaseAdmin
    .from("store_courier_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("store_id", storeResult.storeId);

  if (error) {
    console.error("Error disconnecting courier account:", error);
    return { success: false, error: "Failed to disconnect" };
  }

  return { success: true };
}
