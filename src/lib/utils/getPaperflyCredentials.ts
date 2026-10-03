import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";
import type { PaperflyAuth } from "@/lib/utils/paperflyApi";

export type PaperflyCredentialResult =
  | { ok: true; auth: PaperflyAuth; storeName: string }
  | { ok: false; error: string };

/**
 * Server-only. Paperfly's Basic Auth + paperflykey never expire, so this is
 * just look up and decrypt. `storeId` must come from the caller's verified
 * session, never a client-supplied value — this table has no RLS policy of
 * its own, so this is the only thing stopping one store from using another
 * store's connected Paperfly account.
 */
export async function getPaperflyCredentials(
  credentialId: string,
  storeId: string,
): Promise<PaperflyCredentialResult> {
  const { data: row, error } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("client_id, client_secret, api_key, pathao_store_name")
    .eq("id", credentialId)
    .eq("store_id", storeId)
    .eq("courier", "paperfly")
    .maybeSingle();

  if (error || !row || !row.client_id || !row.client_secret || !row.api_key) {
    return { ok: false, error: "Paperfly account is not connected" };
  }

  return {
    ok: true,
    auth: {
      username: decrypt(row.client_id),
      password: decrypt(row.client_secret),
      paperflyKey: decrypt(row.api_key),
    },
    storeName: row.pathao_store_name ?? "",
  };
}
