import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState, CartItem, CartProductInput } from "../types/cart";

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product: CartProductInput) => {
        return new Promise<void>((resolve) => {
          set((state) => {
            // ✅ FIX: Find existing item with same product ID AND variant ID AND store_slug
            const existing = state.cart.find(
              (item) => 
                item.id === product.id && 
                item.variant_id === product.variant_id && 
                item.store_slug === product.store_slug
            );

            if (existing) {
              return {
                cart: state.cart.map((item) =>
                  item.id === product.id && 
                  item.variant_id === product.variant_id && 
                  item.store_slug === product.store_slug
                    ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                    : item
                ),
              };
            }

            // ✅ FIX: Store both product ID and variant ID
            const cartItem: CartItem = {
              // Basic product info - ALWAYS use main product ID
              id: product.id, // Main product ID
              slug: product.slug,
              name: product.name,
              base_price: product.base_price,
              discounted_price: product.discounted_price,

              // Cart-specific fields
              quantity: product.quantity || 1,
              store_slug: product.store_slug,
              currentPrice: product.currentPrice ?? product.base_price,
              imageUrl: product.imageUrl || product.images?.[0] || "/placeholder.png",

              // Variant info
              variant_id: product.variant_id, // Store variant ID separately
              variant_data: product.variant_data, // Store complete variant data

              // Optional fields
              images: product.images || [],
              category: product.category,
              variants: product.variants,
            };

            console.log('🛒 Adding to cart:', {
              product_id: product.id,
              variant_id: product.variant_id,
              name: product.name
            });

            return { cart: [...state.cart, cartItem] };
          });
          resolve();
        });
      },

      // ... rest of your functions remain the same
      removeItem: (id) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

      clearStoreCart: (store_slug) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.store_slug !== store_slug),
        })),

      getCartByStore: (store_slug) => {
        return get().cart.filter((item) => item.store_slug === store_slug);
      },

      totalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),

      totalItemsByStore: (store_slug) =>
        get().cart
          .filter((item) => item.store_slug === store_slug)
          .reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().cart.reduce((sum, item) => {
          const displayPrice = item.discounted_price && item.discounted_price > 0
            ? item.discounted_price
            : (item.currentPrice ?? item.base_price);
          return sum + displayPrice * item.quantity;
        }, 0),

      totalPriceByStore: (store_slug) =>
        get().cart
          .filter((item) => item.store_slug === store_slug)
          .reduce((sum, item) => {
            const displayPrice = item.discounted_price && item.discounted_price > 0
              ? item.discounted_price
              : (item.currentPrice ?? item.base_price);
            return sum + displayPrice * item.quantity;
          }, 0),
    }),
    {
      name: "cart-storage",
    }
  )
);

export default useCartStore;