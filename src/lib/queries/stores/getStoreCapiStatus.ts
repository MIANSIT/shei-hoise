"use server";

import { createClient } from "@/lib/supabase/server";

export interface StoreCapiStatus {
  hasToken: boolean;
  testEventCode: string | null;
}

/**
 * Admin-settings-only. Never returns the real (encrypted) token value to the
 * caller — only whether one is configured — so the ciphertext never crosses
 * the server/client boundary even for the store's own owner.
 */
export async function getStoreCapiStatus(storeId: string): Promise<StoreCapiStatus> {
  const supabase = createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("facebook_capi_access_token, facebook_test_event_code")
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    hasToken: !!data?.facebook_capi_access_token,
    testEventCode: data?.facebook_test_event_code ?? null,
  };
}
