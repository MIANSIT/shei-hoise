"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getBalance } from "@/lib/utils/steadfastApi";

export interface ConnectSteadfastInput {
  label: string;
  apiKey: string;
  secretKey: string;
}

export interface ConnectSteadfastResult {
  success: boolean;
  error?: string;
  credentialId?: string;
}

/**
 * Steadfast has no login/token step — the Api Key + Secret Key the store
 * owner pastes in are the final credential. Validates them with a balance
 * check (the cheapest authenticated call available) before saving.
 */
export async function connectSteadfastAccount(
  input: ConnectSteadfastInput,
): Promise<ConnectSteadfastResult> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }
  const storeId = storeResult.storeId;

  const balanceResult = await getBalance(input.apiKey, input.secretKey);
  if (!balanceResult.ok) {
    return { success: false, error: balanceResult.error };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("store_courier_credentials")
    .insert({
      store_id: storeId,
      courier: "steadfast",
      label: input.label,
      environment: "live",
      api_key: encrypt(input.apiKey),
      secret_key: encrypt(input.secretKey),
      connected_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Error saving Steadfast credentials:", insertError);
    return { success: false, error: "Failed to save Steadfast credentials" };
  }

  return { success: true, credentialId: inserted.id };
}
