"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BundleType } from "@/lib/schema/bundleSchema";
import { uploadOrUpdateProductImages } from "@/lib/queries/storage/uploadProductImages";
import { validateBundleOptionGroups } from "./validateBundleOptionGroups";

/**
 * Updates a bundle's own fields and replaces its bundle_items recipe
 * wholesale (delete removed rows, update/insert the rest) — mirrors
 * updateProduct.ts's delete-then-upsert approach for variants.
 */
export async function updateBundle(data: BundleType) {
  const { id, store_id, images, bundle_items, ...bundleData } = data;
  if (!id) throw new Error("Bundle ID is required");
  if (!store_id) throw new Error("Store ID is required");
  if (!bundle_items?.length)
    throw new Error("❌ Add at least one product to the bundle");

  validateBundleOptionGroups(bundle_items);

  const componentIds = [
    ...new Set(bundle_items.map((i) => i.component_product_id)),
  ];
  const { data: nestedBundles } = await supabaseAdmin
    .from("products")
    .select("id, name")
    .in("id", componentIds)
    .eq("product_type", "bundle");
  if (nestedBundles && nestedBundles.length > 0) {
    throw new Error(
      `❌ A bundle can't contain another bundle: ${nestedBundles
        .map((b) => b.name)
        .join(", ")}`
    );
  }

  // 1️⃣ Update the bundle's own product row.
  const { error: productError } = await supabaseAdmin
    .from("products")
    .update(bundleData)
    .eq("id", id);
  if (productError) throw productError;

  // 2️⃣ Replace bundle_items wholesale: drop rows no longer referenced by
  // (component_product_id, component_variant_id), then upsert the rest.
  const { data: existingItems, error: fetchError } = await supabaseAdmin
    .from("bundle_items")
    .select("id, component_product_id, component_variant_id")
    .eq("bundle_product_id", id);
  if (fetchError) throw fetchError;

  const key = (c: string, v: string | null | undefined) => `${c}-${v || "none"}`;
  const incomingKeys = new Set(
    bundle_items.map((i) => key(i.component_product_id, i.component_variant_id))
  );
  const toDelete = (existingItems ?? [])
    .filter((e) => !incomingKeys.has(key(e.component_product_id, e.component_variant_id)))
    .map((e) => e.id);

  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin
      .from("bundle_items")
      .delete()
      .in("id", toDelete);
    if (error) throw error;
  }

  const existingKeys = new Set(
    (existingItems ?? []).map((e) => key(e.component_product_id, e.component_variant_id))
  );
  const toInsert = bundle_items.filter(
    (i) => !existingKeys.has(key(i.component_product_id, i.component_variant_id))
  );
  const toUpdate = bundle_items.filter((i) =>
    existingKeys.has(key(i.component_product_id, i.component_variant_id))
  );

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from("bundle_items").insert(
      toInsert.map((item) => ({
        bundle_product_id: id,
        component_product_id: item.component_product_id,
        component_variant_id: item.component_variant_id || null,
        quantity_needed: item.quantity_needed,
        option_group_id: item.option_group_id || null,
        option_group_label: item.option_group_label || null,
      }))
    );
    if (error) throw error;
  }

  for (const item of toUpdate) {
    let query = supabaseAdmin
      .from("bundle_items")
      .update({
        quantity_needed: item.quantity_needed,
        option_group_id: item.option_group_id || null,
        option_group_label: item.option_group_label || null,
      })
      .eq("bundle_product_id", id)
      .eq("component_product_id", item.component_product_id);
    query = item.component_variant_id
      ? query.eq("component_variant_id", item.component_variant_id)
      : query.is("component_variant_id", null);
    const { error } = await query;
    if (error) throw error;
  }

  // 3️⃣ Images
  if (images && images.length > 0) {
    const imagesToSave = images.map((img, index) => ({
      ...img,
      isPrimary: index === 0,
    }));
    await uploadOrUpdateProductImages(store_id, id, imagesToSave);
  }

  return true;
}
