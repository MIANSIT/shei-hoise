import { useState, useEffect, useMemo } from "react";
import useCartStore from "../../lib/store/cartStore";
import { getProductsWithVariants, ProductWithVariants } from "../../lib/queries/products/getProductsWithVariants";
import { getStoreIdBySlug } from "../../lib/queries/stores/getStoreIdBySlug";
import { CartProductWithDetails, CartCalculations } from "../../lib/types/cart";

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

  // Memoize the targetCart to prevent unnecessary re-renders
  const targetCart = useMemo(() => {
    return storeSlug ? getCartByStore(storeSlug) : cart;
  }, [storeSlug, cart, getCartByStore]);

  // Create a stable dependency for the useEffect
  const cartDependency = useMemo(() => {
    return targetCart.map(item => `${item.productId}-${item.variantId}-${item.quantity}`).join(',');
  }, [targetCart]);

  useEffect(() => {
    const fetchCartDetails = async () => {
      // Only fetch if we have items in cart
      if (targetCart.length === 0) {
        setCartItems([]);
        setCalculations({
          items: [],
          totalItems: 0,
          totalPrice: 0,
          totalDiscount: 0,
          subtotal: 0,
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get unique store slugs from cart
        const storeSlugs = [...new Set(targetCart.map(item => item.storeSlug))];
        
        const storeProductsMap = new Map<string, ProductWithVariants[]>();

        // Fetch products for each store
        for (const slug of storeSlugs) {
          try {
            const storeId = await getStoreIdBySlug(slug);
            if (storeId) {
              const products = await getProductsWithVariants(storeId);
              storeProductsMap.set(slug, products);
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

          const product = storeProducts.find(p => p.id === cartItem.productId);
          if (!product) continue;

          // Handle variant - explicitly set to null if no variant exists
          let variant: CartProductWithDetails['variant'] = null;
          if (cartItem.variantId) {
            const foundVariant = product.product_variants.find(v => v.id === cartItem.variantId);
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
          const variantImage = variant?.product_images?.find(img => img.is_primary)?.image_url ||
                              variant?.product_images?.[0]?.image_url;
          const productImage = product.product_images?.find(img => img.is_primary)?.image_url ||
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
            variant, // This can now be null or the variant object
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

    fetchCartDetails();
  }, [cartDependency, storeSlug]); // Use the stable cartDependency

  return {
    items: cartItems,
    calculations,
    loading,
    error,
    refresh: () => {
      // Trigger re-fetch by updating state
      setLoading(true);
      setTimeout(() => {
        const currentTarget = storeSlug ? getCartByStore(storeSlug) : cart;
        if (currentTarget.length === 0) {
          setCartItems([]);
          setCalculations({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            totalDiscount: 0,
            subtotal: 0,
          });
        }
        setLoading(false);
      }, 100);
    },
  };
}

// Helper function to calculate discount percentage
function calculateDiscountPercentage(originalPrice: number, displayPrice: number): number {
  if (!originalPrice || originalPrice <= displayPrice) return 0;
  return Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
}

// Helper function to calculate cart totals
function calculateCartTotals(items: CartProductWithDetails[]): CartCalculations {
  let totalItems = 0;
  let totalPrice = 0;
  let totalDiscount = 0;
  let subtotal = 0;

  items.forEach(item => {
    const itemSubtotal = item.originalPrice * item.quantity;
    const itemTotal = item.displayPrice * item.quantity;
    const itemDiscount = itemSubtotal - itemTotal;

    totalItems += item.quantity;
    subtotal += itemSubtotal;
    totalPrice += itemTotal;
    totalDiscount += itemDiscount;
  });

  return {
    items,
    totalItems,
    totalPrice,
    totalDiscount,
    subtotal,
  };
}