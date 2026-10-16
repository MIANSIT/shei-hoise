"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId, checkDeleteWindow, logDeleted } from "@/lib/permissions/server";
import { deleteBrandLogo } from "@/lib/utils/brandImageStorage";
import { BRANDS_NOT_IN_PLAN_ERROR, storeHasBrandsFeature } from "./brandAccess";

export type DeleteBrandResult =
  | { success: true }
  | { success: false; error: string };

/** Deletes a brand. Its products stay, just without a brand (the products.brand_id FK is ON DELETE SET NULL). */
export async function deleteBrand(brandId: string): Promise<DeleteBrandResult> {
  try {
    const auth = await getAuthorizedStoreId("brands.delete");
    if (!auth.ok) return { success: false, error: auth.error };
    const storeId = auth.storeId;

    if (!(await storeHasBrandsFeature(storeId))) {
      return { success: false, error: BRANDS_NOT_IN_PLAN_ERROR };
    }

    const { data: existing } = await supabaseAdmin
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Brand not found." };

    const tooOld = checkDeleteWindow(auth.actor, existing.created_at);
    if (tooOld) return { success: false, error: tooOld };

    const { error } = await supabaseAdmin
      .from("brands")
      .delete()
      .eq("id", brandId)
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logDeleted(auth.actor, "brands", "brand", existing, `Deleted brand ${existing.name}`);

    await deleteBrandLogo(existing.logo_url).catch((err) =>
      console.error("Failed to delete the brand logo from storage:", err),
    );

    return { success: true };
  } catch (err) {
    console.error("deleteBrand failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete the brand." };
  }
}
