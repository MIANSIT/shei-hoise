"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PathaoEnvironment } from "@/lib/utils/pathaoApi";

export interface PathaoAccountStatus {
  id: string;
  label: string;
  environment: PathaoEnvironment;
  connected: boolean;
  pathaoStoreId: number | null;
  pathaoStoreName: string | null;
  tokenExpiresAt: string | null;
}

/**
 * Status-only — never returns client_secret/access_token/refresh_token to
 * the caller, mirroring getStoreCapiStatus.ts. Returns every Pathao account
 * connected to this store, since a store may now have more than one.
 */
export async function getPathaoConnectedAccounts(
  storeId: string,
): Promise<PathaoAccountStatus[]> {
  const { data } = await supabaseAdmin
    .from("store_pathao_credentials")
    .select("id, label, environment, pathao_store_id, pathao_store_name, token_expires_at, connected_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    environment: row.environment as PathaoEnvironment,
    connected: !!row.connected_at && !!row.pathao_store_id,
    pathaoStoreId: row.pathao_store_id ?? null,
    pathaoStoreName: row.pathao_store_name ?? null,
    tokenExpiresAt: row.token_expires_at ?? null,
  }));
}
