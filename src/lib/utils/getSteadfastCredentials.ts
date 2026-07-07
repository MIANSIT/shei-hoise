import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

export type SteadfastCredentialResult =
  | { ok: true; apiKey: string; secretKey: string }
  | { ok: false; error: string };

/**
 * Server-only. Steadfast's Api-Key/Secret-Key pair never expires, so unlike
 * Pathao there's no refresh step — just look up and decrypt.
 */
export async function getSteadfastCredentials(
  credentialId: string,
): Promise<SteadfastCredentialResult> {
  const { data: row, error } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("api_key, secret_key")
    .eq("id", credentialId)
    .eq("courier", "steadfast")
    .maybeSingle();

  if (error || !row || !row.api_key || !row.secret_key) {
    return { ok: false, error: "Steadfast account is not connected" };
  }

  return { ok: true, apiKey: decrypt(row.api_key), secretKey: decrypt(row.secret_key) };
}
