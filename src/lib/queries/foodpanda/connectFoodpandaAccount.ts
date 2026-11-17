"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import { getOwnerStoreId } from "@/lib/permissions/server";
import { getFoodpandaToken, type FoodpandaEnvironment } from "@/lib/utils/foodpandaApi";

export interface ConnectFoodpandaInput {
  label: string;
  environment: FoodpandaEnvironment;
  chainId: string;
  vendorId: string;
  clientId: string;
  clientSecret: string;
  webhookAuthType: "static" | "hmac";
  orderWebhookSecret: string;
  catalogWebhookSecret: string;
}

export interface ConnectFoodpandaResult {
  success: boolean;
  error?: string;
  accountId?: string;
}

/**
 * Connects a foodpanda vendor. The client credentials are validated by
 * actually requesting a token before anything is stored — a saved credential
 * that cannot authenticate is worse than a failed connect, because the
 * merchant sees "connected" and only discovers otherwise when orders stop.
 */
export async function connectFoodpandaAccount(
  input: ConnectFoodpandaInput,
): Promise<ConnectFoodpandaResult> {
  const storeResult = await getOwnerStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  const chainId = input.chainId.trim();
  const vendorId = input.vendorId.trim();
  if (!chainId || !vendorId) {
    return { success: false, error: "Chain ID and Vendor ID are both required" };
  }
  if (!input.orderWebhookSecret.trim()) {
    return { success: false, error: "A webhook secret is required — without it the order webhook cannot be verified" };
  }

  const tokenCheck = await getFoodpandaToken({
    clientId: input.clientId.trim(),
    clientSecret: input.clientSecret.trim(),
    environment: input.environment,
  });
  if (!tokenCheck.ok) return { success: false, error: tokenCheck.error };

  const now = new Date().toISOString();
  const row = {
    store_id: storeId,
    label: input.label.trim() || "foodpanda",
    environment: input.environment,
    chain_id: chainId,
    vendor_id: vendorId,
    client_id: encrypt(input.clientId.trim()),
    client_secret: encrypt(input.clientSecret.trim()),
    webhook_auth_type: input.webhookAuthType,
    order_webhook_secret: encrypt(input.orderWebhookSecret.trim()),
    // The portal has two URL fields but documents one secret mode per chain,
    // so a blank catalog secret falls back to the order one rather than
    // leaving the catalog webhook unverifiable.
    catalog_webhook_secret: encrypt(
      (input.catalogWebhookSecret.trim() || input.orderWebhookSecret.trim()),
    ),
    is_active: true,
    connected_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from("store_foodpanda_accounts")
    .upsert(row, { onConflict: "store_id,chain_id,vendor_id,environment" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error saving foodpanda account:", error);
    return { success: false, error: "Could not save the foodpanda connection" };
  }

  return { success: true, accountId: data.id };
}

export async function disconnectFoodpandaAccount(
  accountId: string,
): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getOwnerStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const { error } = await supabaseAdmin
    .from("store_foodpanda_accounts")
    .delete()
    .eq("id", accountId)
    .eq("store_id", storeResult.storeId);

  if (error) return { success: false, error: "Could not disconnect the account" };
  return { success: true };
}
