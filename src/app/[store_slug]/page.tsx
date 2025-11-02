/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, use } from "react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import useCartStore from "@/lib/store/cartStore";
import ProductGrid from "../components/products/ProductGrid";

import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug"; // your new query
import { Product } from "@/lib/types/product";
import NotFoundPage from "../not-found";

interface StorePageProps {
  params: Promise<{ store_slug: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { success, error } = useSheiNotification();
  const { addToCart } = useCartStore();
  const { store_slug } = use(params);

  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Check if store exists
        const storeId = await getStoreIdBySlug(store_slug);
        if (!storeId) {
          setStoreExists(false); // store not found
          return;
        }

        setStoreExists(true);

        // Fetch products
        const data = await clientGetProducts(store_slug);
        setProducts(data);
      } catch (err) {
        console.error(err);
        error("Failed to load store or products");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [store_slug, error]);

  const handleAddToCart = async (product: Product) => {
    setLoadingProductId(product.id);
    try {
      // Get the first variant if exists
      const variant = product.variants?.[0];

      // Calculate display price
      const displayPrice =
        variant?.discounted_price && variant.discounted_price > 0
          ? variant.discounted_price
          : variant?.base_price ??
            product.discounted_price ??
            product.base_price;

      // Get display image
      const displayImage =
        variant?.primary_image?.image_url ||
        variant?.product_images?.[0]?.image_url ||
        product.primary_image?.image_url ||
        product.images?.[0] ||
        "/placeholder.png";

      // Create cart product with proper typing
      const cartProduct: any = {
        id: variant?.id || product.id,
        slug: product.slug,
        name: product.name,
        base_price: variant?.base_price || product.base_price,
        discounted_price:
          displayPrice < (variant?.base_price || product.base_price)
            ? displayPrice
            : undefined,
        images: product.images || [],
        quantity: 1,
        store_slug: store_slug,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
            }
          : undefined,
        imageUrl: displayImage,
        currentPrice: displayPrice,
      };

      // Add variants with all required ProductVariant properties
      if (variant) {
        cartProduct.variants = [
          {
            id: variant.id,
            variant_name: variant.variant_name,
            base_price: variant.base_price,
            discounted_price: variant.discounted_price || undefined,
            color: variant.color || undefined,
            product_images: variant.product_images || [],
            // Add the missing required properties from ProductVariant type
            product_id: variant.product_id || product.id, // Use variant's product_id or fallback to product id
            stock: variant.stock || 0, // Default stock value
            primary_image: variant.primary_image || {
              // Default primary_image object
              id: "",
              image_url: displayImage,
              is_primary: true,
            },
          },
        ];
      }

      await addToCart(cartProduct);
      success(`${product.name} added to cart`);
    } catch (err) {
      console.error(err);
      error("Failed to add product to cart");
    } finally {
      setLoadingProductId(null);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex justify-center items-center py-20">
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </>
    );
  }

  if (storeExists === false) {
    return <NotFoundPage />;
  }

  return (
    <>
      <div className="px-8 py-4">
        {products.length === 0 ? (
          <div className="text-center py-20 text-lg font-medium">
            No products available in this store.
          </div>
        ) : (
          <ProductGrid
            store_slug={store_slug}
            products={products}
            onAddToCart={handleAddToCart}
            loadingProductId={loadingProductId}
          />
        )}
      </div>
    </>
  );
}
