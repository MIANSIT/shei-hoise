"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import { trackOrder } from "@/lib/utils/paperflyApi";
import { getOwnerStoreId } from "@/lib/permissions/server";

export interface ConnectPaperflyInput {
  label: string;
  username: string;
  password: string;
  paperflyKey: string;
  storeName: string;
}

export interface ConnectPaperflyResult {
  success: boolean;
  error?: string;
  credentialId?: string;
}

/**
 * Paperfly has no login/token step or balance endpoint — the Merchant Panel
 * username/password + paperflykey are the final credential. Validated with a
 * tracking lookup for a reference that can't exist: an auth failure comes
 * back as 401/403, while "not found" means the credentials were accepted.
 */
export async function connectPaperflyAccount(
  input: ConnectPaperflyInput,
): Promise<ConnectPaperflyResult> {
  const storeResult = await getOwnerStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }
  const storeId = storeResult.storeId;

  const check = await trackOrder(
    { username: input.username, password: input.password, paperflyKey: input.paperflyKey },
    `SH-CONNECT-CHECK-${Date.now()}`,
  );
  if (!check.ok && (check.status === undefined || check.status === 401 || check.status === 403)) {
    return { success: false, error: check.error };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("store_courier_credentials")
    .insert({
      store_id: storeId,
      courier: "paperfly",
      label: input.label,
      environment: "live",
      client_id: encrypt(input.username),
      client_secret: encrypt(input.password),
      api_key: encrypt(input.paperflyKey),
      pathao_store_name: input.storeName,
      connected_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Error saving Paperfly credentials:", insertError);
    return { success: false, error: "Failed to save Paperfly credentials" };
  }

  return { success: true, credentialId: inserted.id };
}
