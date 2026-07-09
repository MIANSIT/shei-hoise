import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

export type SteadfastCredentialResult =
  | { ok: true; apiKey: string; secretKey: string }
  | { ok: false; error: string };

/**
 * Server-only. Steadfast's Api-Key/Secret-Key pair never expires, so unlike
 * Pathao there's no refresh step — just look up and decrypt. `storeId` must
 * come from the caller's verified session (getAuthenticatedStoreId), never a
 * client-supplied value — this table has no RLS policy of its own, so this
 * is the only thing stopping one store from using another store's connected
 * Steadfast account.
 */
export async function getSteadfastCredentials(
  credentialId: string,
  storeId: string,
): Promise<SteadfastCredentialResult> {
  const { data: row, error } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("api_key, secret_key")
    .eq("id", credentialId)
    .eq("store_id", storeId)
    .eq("courier", "steadfast")
    .maybeSingle();

  if (error || !row || !row.api_key || !row.secret_key) {
    return { ok: false, error: "Steadfast account is not connected" };
  }

  return { ok: true, apiKey: decrypt(row.api_key), secretKey: decrypt(row.secret_key) };
}
