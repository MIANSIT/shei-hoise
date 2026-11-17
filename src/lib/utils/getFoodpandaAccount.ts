import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";
import type { FoodpandaAuth, FoodpandaEnvironment } from "@/lib/utils/foodpandaApi";
import type { FoodpandaWebhookAuthType } from "@/lib/utils/verifyFoodpandaWebhook";

export interface FoodpandaAccount {
  id: string;
  storeId: string;
  label: string;
  chainId: string;
  vendorId: string;
  environment: FoodpandaEnvironment;
  auth: FoodpandaAuth;
  webhookAuthType: FoodpandaWebhookAuthType;
  orderWebhookSecret: string;
  catalogWebhookSecret: string;
  isActive: boolean;
}

export type FoodpandaAccountResult =
  | { ok: true; account: FoodpandaAccount }
  | { ok: false; error: string };

/**
 * Server-only. Loads a connected foodpanda account and decrypts its secrets.
 *
 * `storeId` must come from the caller's verified session, never from client
 * input — this table has no RLS policy of its own, so this scoping is the only
 * thing stopping one store from driving another store's foodpanda vendor.
 * The webhook routes are the one exception: they are called BY foodpanda and
 * have no session, so they look the account up by its own id and then verify
 * the request's signature or token before trusting anything in the body.
 */
export async function getFoodpandaAccount(
  accountId: string,
  storeId?: string,
): Promise<FoodpandaAccountResult> {
  let query = supabaseAdmin
    .from("store_foodpanda_accounts")
    .select(
      "id, store_id, label, chain_id, vendor_id, environment, client_id, client_secret, webhook_auth_type, order_webhook_secret, catalog_webhook_secret, is_active",
    )
    .eq("id", accountId);

  if (storeId) query = query.eq("store_id", storeId);

  const { data: row, error } = await query.maybeSingle();

  if (error || !row) return { ok: false, error: "foodpanda account is not connected" };
  if (!row.client_id || !row.client_secret) {
    return { ok: false, error: "foodpanda account is missing its API credentials — reconnect it" };
  }

  // decrypt() throws on a key mismatch (a secret saved under a rotated
  // ENCRYPTION_KEY whose old version was not preserved). Return a clean error
  // rather than letting a 500 escape from a server action or webhook route.
  try {
    return {
      ok: true,
      account: {
        id: row.id,
        storeId: row.store_id,
        label: row.label,
        chainId: row.chain_id,
        vendorId: row.vendor_id,
        environment: row.environment as FoodpandaEnvironment,
        auth: {
          clientId: decrypt(row.client_id),
          clientSecret: decrypt(row.client_secret),
          environment: row.environment as FoodpandaEnvironment,
        },
        webhookAuthType: (row.webhook_auth_type ?? "static") as FoodpandaWebhookAuthType,
        orderWebhookSecret: row.order_webhook_secret ? decrypt(row.order_webhook_secret) : "",
        catalogWebhookSecret: row.catalog_webhook_secret ? decrypt(row.catalog_webhook_secret) : "",
        isActive: row.is_active,
      },
    };
  } catch (err) {
    console.error("Failed to decrypt foodpanda credentials:", err);
    return { ok: false, error: "Saved foodpanda credentials could not be read — reconnect the account" };
  }
}
