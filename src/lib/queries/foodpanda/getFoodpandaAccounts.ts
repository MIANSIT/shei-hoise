"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";

export interface FoodpandaAccountSummary {
  id: string;
  label: string;
  environment: "sandbox" | "live";
  chainId: string;
  vendorId: string;
  webhookAuthType: "static" | "hmac";
  isActive: boolean;
  connectedAt: string | null;
}

/** Connected foodpanda accounts for the caller's store. Secrets never leave the server. */
export async function getFoodpandaAccounts(): Promise<FoodpandaAccountSummary[]> {
  const storeResult = await getAuthorizedStoreId("courier.view");
  if (!storeResult.ok) return [];

  const { data, error } = await supabaseAdmin
    .from("store_foodpanda_accounts")
    .select("id, label, environment, chain_id, vendor_id, webhook_auth_type, is_active, connected_at")
    .eq("store_id", storeResult.storeId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    label: r.label,
    environment: r.environment,
    chainId: r.chain_id,
    vendorId: r.vendor_id,
    webhookAuthType: r.webhook_auth_type ?? "static",
    isActive: r.is_active,
    connectedAt: r.connected_at,
  }));
}
