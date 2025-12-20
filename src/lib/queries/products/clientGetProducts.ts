/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/queries/products/clientGetProducts.ts
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types/product";
import { ProductStatus } from "@/lib/types/enums";

export async function clientGetProducts(
  store_slug: string,
  page: number = 1,
  limit: number = 5,
  categoryName?: string,
  searchQuery?: string
): Promise<{ products: Product[]; hasMore: boolean; totalCount: number }> {
  console.log("Loading products with:", { store_slug, page, limit, categoryName, searchQuery });

  try {
    // Get store ID
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_slug")
      .eq("store_slug", store_slug)
      .single();

    if (storeError || !storeData) {
      throw storeError || new Error("Store not found");
    }

    const storeId = storeData.id;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Build base query
    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        description,
        short_description,
        base_price,
        discounted_price,
        status,
        categories(id, name, slug),
        product_variants(
          id,
          variant_name,
          base_price,
          discounted_price,
          color,
          is_active,
          product_inventory(quantity_available, quantity_reserved),
          product_images(id, image_url, is_primary)
        ),
        product_images(id, image_url, is_primary),
        product_inventory(quantity_available, quantity_reserved),
        created_at
      `,
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .eq("status", ProductStatus.ACTIVE);

    // Apply category filter - IMPORTANT: Use inner join with categories
    if (categoryName && categoryName !== "All Products") {
      console.log("Applying category filter:", categoryName);
      
      // First, get the category ID
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id")
        .eq("store_id", storeId)
        .eq("name", categoryName)
        .single();

      if (categoryData) {
        query = query.eq("category_id", categoryData.id);
      }
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim() !== "") {
      console.log("Applying search filter:", searchQuery);
      const searchTerm = `%${searchQuery}%`;
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`
      );
    }

    // Apply pagination and ordering
    const { data: products, error: productError, count } = await query
      .order("created_at", { ascending: false })
      .range(start, end);

    if (productError) {
      console.error("Product query error:", productError);
      throw productError;
    }

    console.log("Found products:", products?.length, "Total count:", count);

    // Map products
    const mappedProducts = (products ?? []).map((p: any) => {
      const primary_image =
        p.product_images?.find((img: any) => img.is_primary) ||
        p.product_images?.[0] ||
        null;
      const baseStock = p.product_inventory?.[0] || {
        quantity_available: 0,
        quantity_reserved: 0,
      };

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        short_description: p.short_description,
        slug: p.slug,
        base_price: Number(p.base_price),
        discounted_price: p.discounted_price
          ? Number(p.discounted_price)
          : null,
        status: (p.status as ProductStatus) || ProductStatus.ACTIVE,
        category: p.categories
          ? { 
              id: p.categories.id, 
              name: p.categories.name,
              slug: p.categories.slug
            }
          : null,
        images: p.product_images?.map((img: any) => img.image_url) || [],
        primary_image,
        product_inventory: baseStock,
        stock: baseStock.quantity_available > 0 ? baseStock : null,
        variants: (p.product_variants ?? [])
          .filter((v: any) => v.is_active)
          .map((v: any) => ({
            id: v.id,
            product_id: p.id,
            variant_name: v.variant_name,
            base_price: Number(v.base_price),
            discounted_price: v.discounted_price
              ? Number(v.discounted_price)
              : null,
            color: v.color,
            is_active: v.is_active ?? true,
            stock: v.product_inventory?.[0] || {
              quantity_available: 0,
              quantity_reserved: 0,
            },
            product_inventory: v.product_inventory?.[0],
            primary_image:
              v.product_images?.find((img: any) => img.is_primary) ||
              v.product_images?.[0] ||
              null,
            product_images: v.product_images ?? [],
          })),
        created_at: p.created_at,
      } as Product;
    });

    // Sort: in-stock first
    const sortedProducts = mappedProducts.sort((a, b) => {
      const aInStock = isProductInStock(a);
      const bInStock = isProductInStock(b);
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;
      return 0;
    });

    const hasMore = count ? end + 1 < count : false;

    return {
      products: sortedProducts,
      hasMore,
      totalCount: count || 0,
    };
  } catch (error) {
    console.error("Error in clientGetProducts:", error);
    throw error;
  }
}

function isProductInStock(product: Product): boolean {
  if (product.variants && product.variants.length > 0) {
    return product.variants.some((variant) => {
      const productInventory = variant.product_inventory?.[0];
      if (productInventory && productInventory.quantity_available > 0) {
        return true;
      }
      const stock = variant.stock;
      if (stock && stock.quantity_available > 0) {
        return true;
      }
      return false;
    });
  }

  const mainProductInventory = product.product_inventory?.[0];
  if (mainProductInventory && mainProductInventory.quantity_available > 0) {
    return true;
  }
  const mainStock = product.stock;
  if (mainStock && mainStock.quantity_available > 0) {
    return true;
  }

  return false;
}