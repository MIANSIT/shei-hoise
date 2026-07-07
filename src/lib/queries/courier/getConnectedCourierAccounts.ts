"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type CourierType = "pathao" | "steadfast";

export interface CourierAccountStatus {
  id: string;
  courier: CourierType;
  label: string;
  environment: "sandbox" | "live";
  connected: boolean;
  pathaoStoreId: number | null;
  pathaoStoreName: string | null;
  tokenExpiresAt: string | null;
}

/**
 * Status-only — never returns client_secret/access_token/refresh_token/
 * api_key/secret_key to the caller, mirroring getStoreCapiStatus.ts. Returns
 * every connected account for this store, across both couriers; callers
 * filter by `courier` when they only care about one.
 */
export async function getConnectedCourierAccounts(
  storeId: string,
): Promise<CourierAccountStatus[]> {
  const { data } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("id, courier, label, environment, pathao_store_id, pathao_store_name, api_key, token_expires_at, connected_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    courier: row.courier as CourierType,
    label: row.label,
    environment: row.environment as "sandbox" | "live",
    connected:
      row.courier === "steadfast" ? !!row.api_key : !!row.connected_at && !!row.pathao_store_id,
    pathaoStoreId: row.pathao_store_id ?? null,
    pathaoStoreName: row.pathao_store_name ?? null,
    tokenExpiresAt: row.token_expires_at ?? null,
  }));
}
