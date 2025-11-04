/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from "react";
import useCartStore from "../../lib/store/cartStore";
import { getProductsWithVariants } from "../../lib/queries/products/getProductsWithVariants";
import { getStoreIdBySlug } from "../../lib/queries/stores/getStoreIdBySlug";
import { CartProductWithDetails, CartCalculations, CartItem } from "../../lib/types/cart";

export function useCartItems(storeSlug?: string) {
  const { cart, getCartByStore } = useCartStore();
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
  
  // Refs to track previous states
  const previousCartRef = useRef<CartItem[]>([]);
  const hasLoadedRef = useRef(false);
  const productDataCacheRef = useRef<Map<string, any>>(new Map());

  // Memoize target cart
  const targetCart = useMemo(() => {
    return storeSlug ? getCartByStore(storeSlug) : cart;
  }, [storeSlug, cart, getCartByStore]);

  // Check if we need to fetch product data
  const shouldFetchProducts = useMemo(() => {
    if (targetCart.length === 0) {
      // If cart is empty and we had items before, we need to reset
      return previousCartRef.current.length > 0;
    }

    // Check if new products were added (not just quantity changes)
    const currentKeys = targetCart.map(item => `${item.productId}-${item.variantId}`).sort().join(',');
    const previousKeys = previousCartRef.current.map(item => `${item.productId}-${item.variantId}`).sort().join(',');
    
    return currentKeys !== previousKeys || !hasLoadedRef.current;
  }, [targetCart]);

  // Fetch product data when needed
  useEffect(() => {
    const fetchCartDetails = async () => {
      if (targetCart.length === 0 && !shouldFetchProducts) {
        // Don't fetch if cart is empty and no fetch is needed
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (targetCart.length === 0) {
          // Clear cart if empty
          setCartItems([]);
          setCalculations({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            totalDiscount: 0,
            subtotal: 0,
          });
          previousCartRef.current = [];
          hasLoadedRef.current = true;
          return;
        }

        // Get unique store slugs from cart
        const storeSlugs = [...new Set(targetCart.map(item => item.storeSlug))];
        
        const storeProductsMap = new Map<string, any>();

        // Fetch products for each store
        for (const slug of storeSlugs) {
          try {
            // Check cache first
            const cacheKey = `store-${slug}`;
            if (productDataCacheRef.current.has(cacheKey)) {
              storeProductsMap.set(slug, productDataCacheRef.current.get(cacheKey));
            } else {
              const storeId = await getStoreIdBySlug(slug);
              if (storeId) {
                const products = await getProductsWithVariants(storeId);
                storeProductsMap.set(slug, products);
                productDataCacheRef.current.set(cacheKey, products);
              }
            }
          } catch (err) {
            console.error(`Error fetching products for store ${slug}:`, err);
          }
        }

        // Enrich cart items with fresh product data
        const enrichedItems: CartProductWithDetails[] = [];

        for (const cartItem of targetCart) {
          const storeProducts = storeProductsMap.get(cartItem.storeSlug);
          if (!storeProducts) continue;

          const product = storeProducts.find((p: any) => p.id === cartItem.productId);
          if (!product) continue;

          // Handle variant - explicitly set to null if no variant exists
          let variant: CartProductWithDetails['variant'] = null;
          if (cartItem.variantId) {
            const foundVariant = product.product_variants.find((v: any) => v.id === cartItem.variantId);
            variant = foundVariant || null;
          }

          // Calculate prices - handle null values properly
          const variantPrice = variant?.discounted_price || variant?.base_price;
          const productPrice = product.discounted_price || product.base_price;
          
          const displayPrice = variantPrice || productPrice || 0;
          const originalPrice = variant?.base_price || product.base_price || 0;
          
          const discountPercentage = calculateDiscountPercentage(originalPrice, displayPrice);
          
          // Handle stock calculation
          const stock = variant?.product_inventory?.[0]?.quantity_available || 
                       product.product_inventory?.[0]?.quantity_available || 0;

          // Get image URL
          const variantImage = variant?.product_images?.find((img: any) => img.is_primary)?.image_url ||
                              variant?.product_images?.[0]?.image_url;
          const productImage = product.product_images?.find((img: any) => img.is_primary)?.image_url ||
                              product.product_images?.[0]?.image_url;
          const imageUrl = variantImage || productImage || "/placeholder.png";

          // Create product name
          const productName = variant 
            ? `${product.name} - ${variant.variant_name}` 
            : product.name;

          enrichedItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            storeSlug: cartItem.storeSlug,
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

        setCartItems(enrichedItems);
        previousCartRef.current = [...targetCart];
        hasLoadedRef.current = true;

        // Calculate totals
        const calculations = calculateCartTotals(enrichedItems);
        setCalculations(calculations);

      } catch (err) {
        console.error("Error fetching cart details:", err);
        setError("Failed to load cart items");
      } finally {
        setLoading(false);
      }
    };

    if (shouldFetchProducts) {
      fetchCartDetails();
    }
  }, [shouldFetchProducts, targetCart]);

  // Handle local updates (quantity changes and removals) without refetching
  useEffect(() => {
    if (!hasLoadedRef.current || loading) return;

    const currentKeys = new Set(targetCart.map(item => `${item.productId}-${item.variantId}`));
    const previousKeys = new Set(previousCartRef.current.map(item => `${item.productId}-${item.variantId}`));

    // Check if items were removed
    const itemsRemoved = previousKeys.size > currentKeys.size;
    
    // Check if quantities changed
    const quantitiesChanged = previousCartRef.current.some(prevItem => {
      const currentItem = targetCart.find(
        item => item.productId === prevItem.productId && item.variantId === prevItem.variantId
      );
      return currentItem && currentItem.quantity !== prevItem.quantity;
    });

    if (itemsRemoved || quantitiesChanged) {
      let updatedItems = [...cartItems];

      // Handle removals
      if (itemsRemoved) {
        updatedItems = updatedItems.filter(item => 
          targetCart.some(cartItem => 
            cartItem.productId === item.productId && 
            cartItem.variantId === item.variantId
          )
        );
      }

      // Handle quantity updates
      if (quantitiesChanged) {
        updatedItems = updatedItems.map(item => {
          const currentCartItem = targetCart.find(
            cartItem => cartItem.productId === item.productId && cartItem.variantId === item.variantId
          );
          
          if (currentCartItem && currentCartItem.quantity !== item.quantity) {
            return {
              ...item,
              quantity: currentCartItem.quantity
            };
          }
          return item;
        });
      }

      setCartItems(updatedItems);
      const newCalculations = calculateCartTotals(updatedItems);
      setCalculations(newCalculations);
      previousCartRef.current = [...targetCart];
    }
  }, [targetCart, cartItems, loading]);

  return {
    items: cartItems,
    calculations,
    loading: loading && !hasLoadedRef.current, // Only show loading on initial load
    error,
    refresh: () => {
      productDataCacheRef.current.clear();
      hasLoadedRef.current = false;
      setLoading(true);
    },
  };
}

// Helper function to calculate discount percentage
function calculateDiscountPercentage(originalPrice: number, displayPrice: number): number {
  if (!originalPrice || originalPrice <= displayPrice) return 0;
  return Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
}

// Helper function to calculate cart totals
// Helper function to calculate cart totals
function calculateCartTotals(items: CartProductWithDetails[]): CartCalculations {
  let totalItems = 0;
  let totalPrice = 0;
  let totalDiscount = 0;
  let subtotal = 0;

  items.forEach(item => {
    // Use displayPrice if available, otherwise fall back to originalPrice
    const effectivePrice = item.displayPrice || item.originalPrice || 0;
    const itemSubtotal = effectivePrice * item.quantity;
    const itemTotal = effectivePrice * item.quantity;
    const itemDiscount = ((item.originalPrice || 0) - effectivePrice) * item.quantity;

    totalItems += item.quantity;
    subtotal += itemSubtotal;
    totalPrice += itemTotal;
    totalDiscount += Math.max(0, itemDiscount); // Ensure discount is never negative
  });

  return {
    items,
    totalItems,
    totalPrice,
    totalDiscount,
    subtotal,
  };
}