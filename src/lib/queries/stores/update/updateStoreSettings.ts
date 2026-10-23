"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/utils/encryption";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import type {
  UpdatedStoreSettings,
  StoreSettings,
} from "@/lib/types/store/store";
import { requireOwner } from "@/lib/permissions/server";
import { invalidateStoreSettingsCache } from "@/lib/queries/stores/getStoreSettings";

export async function updateStoreSettings(
  storeId: string,
  payload: UpdatedStoreSettings
): Promise<StoreSettings | null> {
  const auth = await requireOwner({ storeId });
  if (!auth.ok) {
    console.error("updateStoreSettings:", auth.error);
    return null;
  }

  const supabase = createClient();
  const finalPayload = { ...payload };

  // The settings form only ever sends this field when the owner typed a
  // genuinely new token (it's a write-only field, never pre-filled with the
  // real stored value) — so it's always safe to encrypt whatever arrives
  // here, never a risk of double-encrypting an already-encrypted value.
  if (finalPayload.facebook_capi_access_token) {
    finalPayload.facebook_capi_access_token = encrypt(finalPayload.facebook_capi_access_token);
  }

  if (finalPayload.terms_and_conditions) {
    finalPayload.terms_and_conditions = sanitizeHtml(finalPayload.terms_and_conditions);
  }
  if (finalPayload.privacy_policy) {
    finalPayload.privacy_policy = sanitizeHtml(finalPayload.privacy_policy);
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

  // The storefront layout (announcement bar's free-shipping text, header,
  // footer) reads these settings through a short in-memory cache and sits
  // behind a 5-min route cache — clear both so edits show up immediately.
  invalidateStoreSettingsCache(storeId);
  revalidatePath("/[store_slug]", "layout");

  // Never send the (encrypted) token value back over the wire — the caller
  // never needs it, and it should never round-trip into client state.
  if (data) {
    data.facebook_capi_access_token = null;
    // The Facebook ads token (see facebookAds queries) lives in the same row
    // and `select("*")` returns it — strip it for the same reason.
    delete (data as Record<string, unknown>).facebook_ads_access_token;
  }

  return data;
}
