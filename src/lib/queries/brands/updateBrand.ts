"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { updateBrandSchema, type UpdateBrandInput } from "@/lib/schema/brand.schema";
import { uploadBrandLogo, deleteBrandLogo } from "@/lib/utils/brandImageStorage";
import { BRANDS_NOT_IN_PLAN_ERROR, storeHasBrandsFeature, uniqueBrandSlug } from "./brandAccess";

export type UpdateBrandResult =
  | { success: true }
  | { success: false; error: string };

/**
 * `logoFile`: undefined leaves the logo alone, null removes it, a File replaces it.
 * Returned as a value, not thrown — see createBrand.ts.
 */
export async function updateBrand(input: UpdateBrandInput, logoFile?: File | null): Promise<UpdateBrandResult> {
  try {
    const parsed = updateBrandSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand" };
    const payload = parsed.data;

    const auth = await getAuthorizedStoreId("brands.edit");
    if (!auth.ok) return { success: false, error: auth.error };
    const storeId = auth.storeId;

    if (!(await storeHasBrandsFeature(storeId))) {
      return { success: false, error: BRANDS_NOT_IN_PLAN_ERROR };
    }

    // payload.id is caller-supplied: only a brand of the caller's own store is touched.
    const { data: existing } = await supabaseAdmin
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("id", payload.id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Brand not found." };

    // A renamed brand gets a fresh slug; an unchanged name keeps its slug so
    // shared ?brand= links keep working.
    const renamed = existing.name !== payload.name;
    const slug = renamed ? await uniqueBrandSlug(storeId, payload.name, payload.id) : existing.slug;

    let logoUpdate: { logo_url: string | null } | Record<string, never> = {};
    if (logoFile === null) logoUpdate = { logo_url: null };
    else if (logoFile) logoUpdate = { logo_url: await uploadBrandLogo(logoFile, storeId, payload.id) };

    const { error } = await supabaseAdmin
      .from("brands")
      .update({
        name: payload.name,
        slug,
        is_active: payload.is_active,
        updated_at: new Date().toISOString(),
        ...logoUpdate,
      })
      .eq("id", payload.id)
      .eq("store_id", storeId);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `A brand named "${payload.name}" already exists.` };
      }
      return { success: false, error: error.message };
    }

    // Only remove the old file once the row has committed.
    if (logoFile !== undefined && existing.logo_url) {
      await deleteBrandLogo(existing.logo_url).catch((err) =>
        console.error("Failed to delete the old brand logo:", err),
      );
    }

    return { success: true };
  } catch (err) {
    console.error("updateBrand failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update the brand." };
  }
}
