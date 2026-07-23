"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { BundleType } from "@/lib/schema/bundleSchema";
import { uploadOrUpdateProductImages } from "@/lib/queries/storage/uploadProductImages";
import { ProductStatus } from "@/lib/types/enums";
import { checkLimit } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { validateBundleOptionGroups } from "./validateBundleOptionGroups";

/**
 * Creates a bundle: a products row (product_type = "bundle") with no
 * product_inventory row of its own, plus its bundle_items recipe. Mirrors
 * createProduct.ts's structure and rollback approach; the one structural
 * difference is that a bundle never gets a createInventory() call — its
 * stock is always derived from its components at read time.
 */
export async function createBundle(bundle: BundleType) {
  if (!bundle.store_id) throw new Error("Store ID is missing");

  if (!bundle.name?.trim()) throw new Error("❌ Bundle name is required");
  if (!bundle.slug?.trim()) throw new Error("❌ Slug is required");
  if (!bundle.description?.trim())
    throw new Error("❌ Description is required");
  if (!bundle.bundle_items?.length)
    throw new Error("❌ Add at least one product to the bundle");

  validateBundleOptionGroups(bundle.bundle_items);

  // Plan limit check — a bundle still counts as a product against the quota.
  const { count: currentProductCount } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", bundle.store_id);

  const subscription = await getStoreFeatureSubscription(bundle.store_id);
  const limitCheck = checkLimit(
    subscription,
    "max_products",
    currentProductCount ?? 0
  );
  if (!limitCheck.allowed) {
    throw new Error(
      `You've reached your plan's limit of ${limitCheck.limit} products. Upgrade your plan to add more.`
    );
  }

  // Reject nesting a bundle inside another bundle.
  const componentIds = [
    ...new Set(bundle.bundle_items.map((i) => i.component_product_id)),
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

  let bundleId: string | null = null;

  const rollback = async () => {
    if (!bundleId) return;
    const tablesToDelete = [
      { table: "product_images", column: "product_id", values: [bundleId] },
      { table: "bundle_items", column: "bundle_product_id", values: [bundleId] },
      { table: "products", column: "id", values: [bundleId] },
    ];
    for (const { table, column, values } of tablesToDelete) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .in(column, values);
      if (error) console.error(`Rollback failed for ${table}:`, error);
    }
  };

  try {
    const { data: productData, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        store_id: bundle.store_id,
        category_id: bundle.category_id,
        name: bundle.name.trim(),
        slug: bundle.slug.trim(),
        description: bundle.description.trim(),
        short_description: bundle.short_description,
        base_price: bundle.base_price,
        discounted_price: bundle.discounted_price,
        discount_amount: bundle.discount_amount,
        sku: bundle.sku,
        status: bundle.status ?? ProductStatus.ACTIVE,
        featured: bundle.featured,
        product_type: "bundle",
      })
      .select("id")
      .single();

    if (productError) {
      if (productError.code === "23505") {
        const conflictField =
          productError.details?.match(/\((.*?)\)=/)?.[1] || "name or slug";
        throw new Error(
          `❌ A product with this ${conflictField} already exists. Please choose a different ${conflictField}.`
        );
      }
      throw new Error(productError.message ?? "❌ Failed to create bundle");
    }

    if (!productData?.id) throw new Error("❌ Bundle ID not returned");
    bundleId = productData.id;

    const { error: itemsError } = await supabaseAdmin
      .from("bundle_items")
      .insert(
        bundle.bundle_items.map((item) => ({
          bundle_product_id: bundleId,
          component_product_id: item.component_product_id,
          component_variant_id: item.component_variant_id || null,
          quantity_needed: item.quantity_needed,
          option_group_id: item.option_group_id || null,
          option_group_label: item.option_group_label || null,
        }))
      );
    if (itemsError) throw itemsError;

    if (bundle.images?.length) {
      await uploadOrUpdateProductImages(
        bundle.store_id,
        bundleId!,
        bundle.images
      );
    }

    return bundleId;
  } catch (err: unknown) {
    console.error("❌ createBundle failed:", err);
    try {
      await rollback();
    } catch (rollbackErr) {
      console.error("⚠️ Rollback encountered errors:", rollbackErr);
    }
    throw err;
  }
}
