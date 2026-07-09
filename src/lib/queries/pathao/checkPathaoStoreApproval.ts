"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { getMerchantStores } from "@/lib/utils/pathaoApi";

export interface CheckApprovalResult {
  success: boolean;
  connected: boolean;
  error?: string;
}

/**
 * Re-checks a just-created store against Pathao's account by name, since
 * Create a Store's own response never returns a store_id. Once it shows up
 * active, saves pathao_store_id/name and marks the connection complete.
 */
export async function checkPathaoStoreApproval(
  credentialId: string,
  expectedStoreName: string,
): Promise<CheckApprovalResult> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, connected: false, error: storeResult.error };
  }

  const tokenResult = await getValidPathaoAccessToken(credentialId, storeResult.storeId);
  if (!tokenResult.ok) {
    return { success: false, connected: false, error: tokenResult.error };
  }

  const result = await getMerchantStores(tokenResult.environment, tokenResult.accessToken);
  if (!result.ok) {
    return { success: false, connected: false, error: result.error };
  }

  const match = (result.data.data.data ?? []).find(
    (s) => s.store_name === expectedStoreName,
  );

  if (!match || !match.is_active) {
    return { success: true, connected: false };
  }

  const { error } = await supabaseAdmin
    .from("store_courier_credentials")
    .update({
      pathao_store_id: match.store_id,
      pathao_store_name: match.store_name,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId)
    .eq("store_id", storeResult.storeId);

  if (error) {
    console.error("Error saving approved Pathao store:", error);
    return { success: false, connected: false, error: "Failed to save the approved store" };
  }

  return { success: true, connected: true };
}
