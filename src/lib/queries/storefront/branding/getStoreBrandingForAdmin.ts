"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import type { StoreBranding } from "@/lib/types/store/store";

/** The caller's own branding row, for prefilling the Storefront Design form. */
export async function getStoreBrandingForAdmin(): Promise<StoreBranding | null> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return null;

  const { data, error } = await supabaseAdmin
    .from("store_branding")
    .select("id, store_id, theme_palette, announcement_text, created_at, updated_at")
    .eq("store_id", storeResult.storeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoreBranding;
}
