"use server";

import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { getMerchantStores, type PathaoStore } from "@/lib/utils/pathaoApi";
import { getOwnerStoreId } from "@/lib/permissions/server";

export interface GetPathaoExistingStoresResult {
  success: boolean;
  stores: PathaoStore[];
  error?: string;
}

/**
 * Re-lists a merchant's Pathao stores using a credential that's already
 * logged in — lets "Resume Setup" pick up a connection that was saved in
 * Step 1 but abandoned before a store was selected/created, without asking
 * the store owner to log in again.
 */
export async function getPathaoExistingStores(
  credentialId: string,
): Promise<GetPathaoExistingStoresResult> {
  const storeResult = await getOwnerStoreId();
  if (!storeResult.ok) {
    return { success: false, stores: [], error: storeResult.error };
  }

  const tokenResult = await getValidPathaoAccessToken(credentialId, storeResult.storeId);
  if (!tokenResult.ok) {
    return { success: false, stores: [], error: tokenResult.error };
  }

  const result = await getMerchantStores(tokenResult.environment, tokenResult.accessToken);
  if (!result.ok) {
    return { success: false, stores: [], error: result.error };
  }

  return { success: true, stores: result.data.data.data ?? [] };
}
