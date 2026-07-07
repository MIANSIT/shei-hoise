"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import {
  issueToken,
  getMerchantStores,
  getResolvedPathaoEnvironment,
  type PathaoStore,
} from "@/lib/utils/pathaoApi";

export interface ConnectPathaoInput {
  label: string;
  client_id: string;
  client_secret: string;
  email: string;
  password: string;
}

export interface ConnectPathaoResult {
  success: boolean;
  error?: string;
  credentialId?: string;
  existingStores?: PathaoStore[];
}

/**
 * Logs into Pathao with a new set of credentials and saves them as a new
 * connected account for this store (a store may have several). Reports back
 * whether that Pathao account already has one or more stores — the UI
 * branches on this to either show a picker or walk through Create a Store.
 * Sandbox vs live is resolved automatically, never chosen by the store owner.
 */
export async function connectPathaoAccount(
  storeId: string,
  input: ConnectPathaoInput,
): Promise<ConnectPathaoResult> {
  const environment = getResolvedPathaoEnvironment();

  const tokenResult = await issueToken(environment, {
    client_id: input.client_id,
    client_secret: input.client_secret,
    username: input.email,
    password: input.password,
  });

  if (!tokenResult.ok) {
    return { success: false, error: tokenResult.error };
  }

  const { access_token, refresh_token, expires_in } = tokenResult.data;
  const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("store_pathao_credentials")
    .insert({
      store_id: storeId,
      label: input.label,
      environment,
      client_id: input.client_id,
      client_secret: encrypt(input.client_secret),
      access_token: encrypt(access_token),
      refresh_token: encrypt(refresh_token),
      token_expires_at: tokenExpiresAt,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Error saving Pathao credentials:", insertError);
    return { success: false, error: "Failed to save Pathao credentials" };
  }

  const storesResult = await getMerchantStores(environment, access_token);
  if (!storesResult.ok) {
    // Login succeeded and is saved — just couldn't list stores yet. The UI
    // can retry the store step without asking the owner to log in again.
    return { success: true, credentialId: inserted.id, existingStores: [] };
  }

  return {
    success: true,
    credentialId: inserted.id,
    existingStores: storesResult.data.data.data ?? [],
  };
}
