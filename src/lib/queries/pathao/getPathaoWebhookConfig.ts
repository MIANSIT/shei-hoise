"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { generateWebhookSecret } from "@/lib/utils/generateWebhookSecret";

export interface PathaoWebhookConfigResult {
  success: boolean;
  error?: string;
  callbackUrl?: string;
  secret?: string;
}

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Returns the callback URL and secret a store should paste into their own
 * Pathao merchant panel's webhook settings. Generates and saves a secret on
 * first call for a given connected account — every connection gets its own,
 * so one store's leaked secret can never be used to forge another store's
 * webhook events.
 */
export async function getPathaoWebhookConfig(
  credentialId: string,
): Promise<PathaoWebhookConfigResult> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) {
    return { success: false, error: storeResult.error };
  }

  const { data: row, error } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("webhook_secret")
    .eq("id", credentialId)
    .eq("store_id", storeResult.storeId)
    .eq("courier", "pathao")
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: "This Pathao account was not found" };
  }

  let secret = row.webhook_secret ? decrypt(row.webhook_secret) : null;

  if (!secret) {
    secret = generateWebhookSecret();
    const { error: updateError } = await supabaseAdmin
      .from("store_courier_credentials")
      .update({ webhook_secret: encrypt(secret), updated_at: new Date().toISOString() })
      .eq("id", credentialId)
      .eq("store_id", storeResult.storeId);

    if (updateError) {
      console.error("Error saving Pathao webhook secret:", updateError);
      return { success: false, error: "Failed to generate a webhook secret" };
    }
  }

  return {
    success: true,
    callbackUrl: `${APP_URL}/api/pathao/webhook/${credentialId}`,
    secret,
  };
}
