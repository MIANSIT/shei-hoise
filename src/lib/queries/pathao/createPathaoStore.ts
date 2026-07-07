"use server";

import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import { createStore, type CreateStorePayload } from "@/lib/utils/pathaoApi";

export interface CreatePathaoStoreResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Registers a new pickup location with Pathao. Does not return a store_id —
 * Pathao's own response only echoes the store name. The new store also needs
 * roughly an hour of manual approval before checkPathaoStoreApproval will see
 * it as active.
 */
export async function createPathaoStore(
  credentialId: string,
  payload: CreateStorePayload,
): Promise<CreatePathaoStoreResult> {
  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) {
    return { success: false, error: tokenResult.error };
  }

  const result = await createStore(tokenResult.environment, tokenResult.accessToken, payload);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return { success: true, message: result.data.message };
}
