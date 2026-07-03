"use server";

import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/utils/encryption";
import type {
  UpdatedStoreSettings,
  StoreSettings,
} from "@/lib/types/store/store";

export async function updateStoreSettings(
  storeId: string,
  payload: UpdatedStoreSettings
): Promise<StoreSettings | null> {
  const supabase = createClient();
  const finalPayload = { ...payload };

  // The settings form only ever sends this field when the owner typed a
  // genuinely new token (it's a write-only field, never pre-filled with the
  // real stored value) — so it's always safe to encrypt whatever arrives
  // here, never a risk of double-encrypting an already-encrypted value.
  if (finalPayload.facebook_capi_access_token) {
    finalPayload.facebook_capi_access_token = encrypt(finalPayload.facebook_capi_access_token);
  }

  const { data, error } = await supabase
    .from("store_settings")
    .update({
      ...finalPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating store settings:", error);
    return null;
  }

  // Never send the (encrypted) token value back over the wire — the caller
  // never needs it, and it should never round-trip into client state.
  if (data) {
    data.facebook_capi_access_token = null;
  }

  return data;
}
