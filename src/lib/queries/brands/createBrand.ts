"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { checkLimit, hasFeature } from "@/lib/utils/planFeatures";
import { brandSchema, type BrandInput } from "@/lib/schema/brand.schema";
import { uploadBrandLogo } from "@/lib/utils/brandImageStorage";
import { BRANDS_FEATURE_KEY, BRANDS_LIMIT_KEY } from "@/lib/types/brand";
import { BRANDS_NOT_IN_PLAN_ERROR, uniqueBrandSlug } from "./brandAccess";

export type CreateBrandResult =
  | { success: true; id: string; /** Set when the brand saved but its logo didn't. */ logoError?: string }
  | { success: false; error: string };

// Returned as a value, not thrown: Server Action errors are redacted in
// production builds, which would turn every message below into a generic one.
export async function createBrand(input: BrandInput, logoFile?: File | null): Promise<CreateBrandResult> {
  try {
    const parsed = brandSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand" };
    const payload = parsed.data;

    const auth = await getAuthorizedStoreId("brands.add");
    if (!auth.ok) return { success: false, error: auth.error };
    const storeId = auth.storeId;

    const subscription = await getStoreFeatureSubscription(storeId);
    if (!hasFeature(subscription, BRANDS_FEATURE_KEY)) {
      return { success: false, error: BRANDS_NOT_IN_PLAN_ERROR };
    }

    const { count } = await supabaseAdmin
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    const limitCheck = checkLimit(subscription, BRANDS_LIMIT_KEY, count ?? 0);
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `You've reached your plan's limit of ${limitCheck.limit} brands. Upgrade your plan to add more.`,
      };
    }

    // A new brand goes to the end of the owner's drag-and-drop order.
    const { data: last } = await supabaseAdmin
      .from("brands")
      .select("sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = last ? Number(last.sort_order) + 1 : 0;

    const slug = await uniqueBrandSlug(storeId, payload.name);
    const { data, error } = await supabaseAdmin
      .from("brands")
      .insert({ store_id: storeId, name: payload.name, slug, is_active: payload.is_active, sort_order: sortOrder })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `A brand named "${payload.name}" already exists.` };
      }
      return { success: false, error: error.message };
    }

    // Uploaded after the insert so the file path can carry the real brand id.
    // A failed upload doesn't undo the brand — the owner can retry from Edit.
    let logoError: string | undefined;
    if (logoFile) {
      try {
        const logo_url = await uploadBrandLogo(logoFile, storeId, data.id);
        const { error: logoUpdateError } = await supabaseAdmin
          .from("brands")
          .update({ logo_url })
          .eq("id", data.id)
          .eq("store_id", storeId);
        if (logoUpdateError) logoError = logoUpdateError.message;
      } catch (err) {
        logoError = err instanceof Error ? err.message : "Failed to upload the logo.";
      }
    }

    return { success: true, id: data.id, logoError };
  } catch (err) {
    console.error("createBrand failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create the brand." };
  }
}
