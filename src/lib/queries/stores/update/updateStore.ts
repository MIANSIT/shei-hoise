"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UpdatedStoreData, StoreData } from "@/lib/types/store/store";
import { getAuthenticatedStoreId } from "@/lib/utils/getAuthenticatedStoreId";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";

export async function updateStore(
  storeId: string,
  payload: UpdatedStoreData
): Promise<StoreData | null> {
  if (!storeId) return null;

  // storeId is caller-supplied — never trust it for authorization on its
  // own. Only allow updating the store the session's own account owns.
  const storeResult = await getAuthenticatedStoreId();
  if (!storeResult.ok || storeResult.storeId !== storeId) {
    console.error("updateStore: unauthorized store access attempt", { storeId });
    return null;
  }

  const {
    store_name,
    store_slug,
    short_description,
    description,
    seo_title,
    seo_description,
    logo_url,
    banner_url,
    is_active,
    status,
    contact_email,
    contact_phone,
    business_address,
    tax_id,
    business_license,
    setup_progress,
  } = payload;

  // Server-side mirror of the client's useFeatureGate check on the Store SEO
  // page — a direct call would otherwise let a plan without SEO tools set a
  // custom SEO title/description anyway. Stripped rather than rejected so
  // the rest of the store still saves.
  let seoTitle = seo_title;
  let seoDescription = seo_description;
  if (seo_title !== undefined || seo_description !== undefined) {
    const subscription = await getStoreFeatureSubscription(storeId);
    if (!hasFeature(subscription, "seo_tools")) {
      seoTitle = seo_title !== undefined ? null : undefined;
      seoDescription = seo_description !== undefined ? null : undefined;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("stores")
    .update({
      store_name,
      store_slug,
      short_description,
      description,
      seo_title: seoTitle,
      seo_description: seoDescription,
      logo_url,
      banner_url,
      is_active,
      status,
      contact_email,
      contact_phone,
      business_address,
      tax_id,
      business_license,
      setup_progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating store:", error);
    return null;
  }

  return data;
}
