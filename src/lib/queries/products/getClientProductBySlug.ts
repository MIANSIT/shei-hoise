"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBundleAvailabilityMap } from "@/lib/queries/bundles/getBundleAvailabilityMap";
import { getBundleContentsMap } from "@/lib/queries/bundles/getBundleContentsMap";
import { getBundleComponentValueMap } from "@/lib/queries/bundles/getBundleComponentValueMap";
import { BundleItem } from "@/lib/types/product";

interface ProductVariant {
  id: string;
  sku: string;
  variant_name: string;
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
  color: string | null;
  attributes?: Record<string, string>;
  weight?: number;
  tp_price?: number;
  is_active: boolean;
  product_inventory: {
    quantity_available: number;
    quantity_reserved: number;
  }[];
  product_images: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  discounted_price: number | null;
  discount_amount: number | null;
  categories: { id: string; name: string }[];
  product_images: { id: string; image_url: string; is_primary: boolean }[];
  product_inventory: {
    quantity_available: number;
    quantity_reserved: number;
  }[];
  product_variants: ProductVariant[];
  product_type: "simple" | "bundle";
  /** Populated only for product_type === "bundle" — what's inside. */
  bundle_items?: BundleItem[];
  /** Populated only for product_type === "bundle" — what the components cost bought separately. */
  component_value?: number;
}

export async function getClientProductBySlug(
  product_slug: string,
): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      sku,
      name,
      slug,
      description,
      short_description,
      base_price,
      discounted_price,
      discount_amount,
      product_type,
      categories(id, name),
      product_images(id, image_url, is_primary),
      product_inventory(quantity_available, quantity_reserved),
      product_variants(
        id,
        sku,
        variant_name,
        base_price,
        discounted_price,
        discount_amount,
        color,
        attributes,
        weight,
        tp_price,
        is_active,
        product_inventory(quantity_available, quantity_reserved),
        product_images(id, image_url, is_primary)
      )
    `,
    )
    .eq("slug", product_slug)
    .single();

  if (error) {
    console.error("Error fetching product by slug:", error);
    throw new Error(error.message);
  }

  if (!data) return null;

  // Filter out inactive variants
  data.product_variants = (data.product_variants || []).filter(
    (variant: ProductVariant) => variant.is_active !== false,
  );

  const product = data as Product;

  // Bundles have no product_inventory row of their own, and need their
  // recipe resolved for the "what's inside" section on the product page.
  if (product.product_type === "bundle") {
    const [availabilityMap, contentsMap, valueMap] = await Promise.all([
      getBundleAvailabilityMap([product.id]),
      getBundleContentsMap([product.id]),
      getBundleComponentValueMap([product.id]),
    ]);
    product.product_inventory = [
      {
        quantity_available: availabilityMap.get(product.id) ?? 0,
        quantity_reserved: 0,
      },
    ];
    product.bundle_items = contentsMap.get(product.id) ?? [];
    product.component_value = valueMap.get(product.id) ?? 0;
  }

  return product;
}
