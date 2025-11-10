/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hook/useUnifiedCartData.ts
import { useState, useEffect, useMemo, useRef } from 'react';
import { useCartItems } from './useCartItems';
import { getStoreIdBySlug } from '../queries/stores/getStoreIdBySlug';
import { getProductsWithVariants } from '../queries/products/getProductsWithVariants';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { CartProductWithDetails, CartCalculations } from '../types/cart';

interface UseUnifiedCartDataProps {
  storeSlug: string;
  compressedData?: string | null;
  useZustand?: boolean;
}

// ✅ FIX: Group duplicate items and sum quantities
const groupAndSumItems = (items: CartProductWithDetails[]): CartProductWithDetails[] => {
  const groupedMap = new Map();
  
  items.forEach(item => {
    const key = `${item.productId}-${item.variantId || 'no-variant'}`;
    
    if (groupedMap.has(key)) {
      // If item already exists, sum the quantities
      const existingItem = groupedMap.get(key);
      groupedMap.set(key, {
        ...existingItem,
        quantity: existingItem.quantity + item.quantity
      });
      console.log(`🔄 Grouped duplicate item: ${key}, new quantity: ${existingItem.quantity + item.quantity}`);
    } else {
      // If item doesn't exist, add it
      groupedMap.set(key, item);
    }
  });
  
  return Array.from(groupedMap.values());
};

export function useUnifiedCartData({ 
  storeSlug, 
  compressedData, 
  useZustand = true 
}: UseUnifiedCartDataProps) {
  const [cartItems, setCartItems] = useState<CartProductWithDetails[]>([]);
  const [calculations, setCalculations] = useState<CartCalculations>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    totalDiscount: 0,
    subtotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const zustandData = useCartItems(useZustand ? storeSlug : undefined);
  
  const previousCompressedDataRef = useRef<string | null>(null);
  const hasFetchedUrlDataRef = useRef(false);
  const productDataCacheRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (useZustand) {
          // Use Zustand cart data - it's already grouped by useCartItems
          setCartItems(zustandData.items);
          setCalculations(zustandData.calculations);
        } else if (compressedData && compressedData !== previousCompressedDataRef.current) {
          previousCompressedDataRef.current = compressedData;
          hasFetchedUrlDataRef.current = true;
          
          const decompressed = decompressFromEncodedURIComponent(compressedData);
          if (!decompressed) {
            throw new Error("Failed to decompress order data");
          }

          const compactProducts: Array<[string, string | undefined, number]> = JSON.parse(decompressed);
          
          if (!compactProducts || !Array.isArray(compactProducts) || compactProducts.length === 0) {
            throw new Error("Invalid order data format");
          }

          // ✅ FIX: Group URL data by productId and variantId
          const groupedCompactProducts = compactProducts.reduce((acc, product) => {
            const key = `${product[0]}-${product[1] || 'no-variant'}`;
            if (acc.has(key)) {
              const existing = acc.get(key);
              acc.set(key, [existing[0], existing[1], existing[2] + product[2]]);
            } else {
              acc.set(key, [...product]);
            }
            return acc;
          }, new Map());

          const uniqueProductsArray = Array.from(groupedCompactProducts.values());

          const storeId = await getStoreIdBySlug(storeSlug);
          if (!storeId) throw new Error('Store not found');

          const cacheKey = `store-${storeId}`;
          let products = productDataCacheRef.current.get(cacheKey);
          
          if (!products) {
            products = await getProductsWithVariants(storeId);
            productDataCacheRef.current.set(cacheKey, products);
          }
          
          const enrichedItems: CartProductWithDetails[] = [];
          
          for (const [productId, variantId, quantity] of uniqueProductsArray) {
            const product = products.find((p: any) => p.id === productId);
            if (!product) continue;

            let variant: CartProductWithDetails['variant'] = null;
            if (variantId) {
              const foundVariant = product.product_variants.find((v: any) => v.id === variantId);
              variant = foundVariant || null;
            }

            const variantPrice = variant?.discounted_price || variant?.base_price;
            const productPrice = product.discounted_price || product.base_price;
            
            const displayPrice = variantPrice || productPrice || 0;
            const originalPrice = variant?.base_price || product.base_price || 0;
            
            const discountPercentage = originalPrice > displayPrice 
              ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) 
              : 0;
            
            const stock = variant?.product_inventory?.[0]?.quantity_available || 
                         product.product_inventory?.[0]?.quantity_available || 0;

            const variantImage = variant?.product_images?.find((img: any) => img.is_primary)?.image_url ||
                                variant?.product_images?.[0]?.image_url;
            const productImage = product.product_images?.find((img: any) => img.is_primary)?.image_url ||
                                product.product_images?.[0]?.image_url;
            const imageUrl = variantImage || productImage || "/placeholder.png";

            const productName = variant 
              ? `${product.name} - ${variant.variant_name}` 
              : product.name;

            enrichedItems.push({
              productId,
              variantId,
              quantity,
              storeSlug,
              product,
              variant,
              displayPrice,
              originalPrice,
              discountPercentage,
              stock,
              isOutOfStock: stock <= 0,
              imageUrl,
              productName,
            });
          }

          // ✅ FIX: Group enriched items to ensure no duplicates
          const groupedEnrichedItems = groupAndSumItems(enrichedItems);
          setCartItems(groupedEnrichedItems);
          
          const totalItems = groupedEnrichedItems.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = groupedEnrichedItems.reduce((sum, item) => sum + (item.displayPrice * item.quantity), 0);
          const totalDiscount = groupedEnrichedItems.reduce((sum, item) => {
            return sum + ((item.originalPrice - item.displayPrice) * item.quantity);
          }, 0);
          const totalPrice = subtotal;

          setCalculations({
            items: groupedEnrichedItems,
            totalItems,
            totalPrice,
            totalDiscount,
            subtotal,
          });
        } else if (!compressedData && !useZustand) {
          setCartItems([]);
          setCalculations({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            totalDiscount: 0,
            subtotal: 0,
          });
        }
      } catch (err) {
        console.error("Error fetching cart data:", err);
        setError(err instanceof Error ? err.message : "Failed to load cart data");
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, [storeSlug, compressedData, useZustand, zustandData]);

  return {
    cartItems,
    calculations,
    loading,
    error,
  };
}