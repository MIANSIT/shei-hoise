import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { refreshAccessToken, type PathaoEnvironment } from "@/lib/utils/pathaoApi";

const REFRESH_MARGIN_MS = 30 * 60 * 1000; // refresh if expiring within 30 minutes

export type ValidTokenResult =
  | { ok: true; accessToken: string; environment: PathaoEnvironment }
  | { ok: false; error: string };

/**
 * Server-only. Not exported to any client component. Every call that needs
 * an authenticated Pathao request goes through this first — replaces a
 * scheduled refresh job with a lazy check-and-refresh right before use, and
 * tells the caller which environment (sandbox/live) this account is
 * connected to, so the actual API call routes to the right host. Keyed by
 * the specific credential row's id, not storeId, since a store can now have
 * more than one connected Pathao account.
 */
export async function getValidPathaoAccessToken(
  credentialId: string,
): Promise<ValidTokenResult> {
  const { data: row, error } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("environment, client_id, client_secret, access_token, refresh_token, token_expires_at")
    .eq("id", credentialId)
    .eq("courier", "pathao")
    .maybeSingle();

  if (error || !row || !row.access_token || !row.refresh_token) {
    return { ok: false, error: "Pathao account is not connected" };
  }

  const environment = row.environment as PathaoEnvironment;
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const stillValid = expiresAt - Date.now() > REFRESH_MARGIN_MS;

  if (stillValid) {
    return { ok: true, accessToken: decrypt(row.access_token), environment };
  }

  const result = await refreshAccessToken(environment, {
    client_id: row.client_id,
    client_secret: decrypt(row.client_secret),
    refresh_token: decrypt(row.refresh_token),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const newExpiresAt = new Date(Date.now() + result.data.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("store_courier_credentials")
    .update({
      access_token: encrypt(result.data.access_token),
      refresh_token: encrypt(result.data.refresh_token),
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credentialId);

  return { ok: true, accessToken: result.data.access_token, environment };
}
