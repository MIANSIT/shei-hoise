"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BundleType } from "@/lib/schema/bundleSchema";

interface DbBundleItem {
  id: string;
  component_product_id: string;
  component_variant_id: string | null;
  quantity_needed: number;
  option_group_id: string | null;
  option_group_label: string | null;
}

interface DbProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean;
}

/** Fetches a bundle for the admin edit-bundle form, in the same shape createBundle/updateBundle expect back. */
export async function getBundleBySlug(
  storeId: string,
  slug: string
): Promise<(BundleType & { id: string }) | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      sku,
      description,
      short_description,
      base_price,
      discounted_price,
      discount_amount,
      featured,
      status,
      category_id,
      product_images(id, image_url, alt_text, sort_order, is_primary),
      bundle_items!bundle_items_bundle_product_id_fkey(id, component_product_id, component_variant_id, quantity_needed, option_group_id, option_group_label)
    `
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("product_type", "bundle")
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const images = ((data.product_images ?? []) as DbProductImage[])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    id: data.id,
    store_id: storeId,
    name: data.name,
    slug: data.slug,
    sku: data.sku ?? "",
    description: data.description ?? "",
    short_description: data.short_description ?? "",
    base_price: Number(data.base_price),
    discounted_price: data.discounted_price ?? null,
    discount_amount: data.discount_amount ?? null,
    status: data.status,
    featured: data.featured === true,
    category_id: data.category_id ?? null,
    images: images.map((img) => ({
      imageUrl: img.image_url,
      altText: img.alt_text ?? undefined,
      isPrimary: img.is_primary,
    })),
    bundle_items: ((data.bundle_items ?? []) as DbBundleItem[]).map((item) => ({
      component_product_id: item.component_product_id,
      component_variant_id: item.component_variant_id,
      quantity_needed: item.quantity_needed,
      option_group_id: item.option_group_id,
      option_group_label: item.option_group_label,
    })),
  };
}
