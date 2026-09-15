"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { isBrandPalette, type BrandPalette } from "@/lib/utils/storeTheme";
import { invalidateStoreBrandingCache } from "@/lib/queries/stores/getStoreBranding";

export interface SaveStoreBrandingInput {
  theme_palette: BrandPalette | null;
  // Legacy single-line field, superseded by the store_announcements table
  // (see the Announcements manager) — nothing reads this column anymore.
  // Optional and omitted by the current Storefront Design form; kept
  // writable only so an old value already saved here is never silently
  // clobbered by a palette-only save.
  announcement_text?: string | null;
}

export async function saveStoreBranding(
  input: SaveStoreBrandingInput,
): Promise<{ success: boolean; error?: string }> {
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  // Server-side mirror of the client's useFeatureGate check — the Storefront
  // Design page hides itself behind FeatureLocked, but this action is the
  // real gate, since a direct call would otherwise bypass the UI entirely.
  const subscription = await getStoreFeatureSubscription(storeId);
  if (!hasFeature(subscription, "storefront_design")) {
    return { success: false, error: "Storefront Design is not available on your plan" };
  }

  if (input.theme_palette !== null && !isBrandPalette(input.theme_palette)) {
    return { success: false, error: "Invalid color palette" };
  }

  // Only included in the write when the caller actually passed it — an
  // upsert only touches the columns present in its payload, so omitting the
  // key here leaves whatever legacy value is already in that column alone
  // instead of nulling it out on every unrelated palette save.
  const payload: Record<string, unknown> = {
    store_id: storeId,
    theme_palette: input.theme_palette,
    updated_at: new Date().toISOString(),
  };
  if (input.announcement_text !== undefined) {
    payload.announcement_text = input.announcement_text?.trim() || null;
  }

  const { error } = await supabaseAdmin
    .from("store_branding")
    .upsert(payload, { onConflict: "store_id" });

  if (error) return { success: false, error: error.message };

  // Two separate caches sit between this write and the storefront: the
  // in-memory 30s cache in getStoreBranding.ts (keyed by this store), and
  // Next.js's own 5-minute route-segment cache on [store_slug]/layout.tsx
  // (export const revalidate = 300). Without both, a saved palette/
  // announcement can take up to 5 minutes to actually show up.
  invalidateStoreBrandingCache(storeId);
  revalidatePath("/[store_slug]", "layout");

  return { success: true };
}
