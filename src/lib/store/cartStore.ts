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
            // Find existing item with same ID AND same store_slug
            const existing = state.cart.find(
              (item) => item.id === product.id && item.store_slug === product.store_slug
            );

            if (existing) {
              return {
                cart: state.cart.map((item) =>
                  item.id === product.id && item.store_slug === product.store_slug
                    ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                    : item
                ),
              };
            }

            // ✅ CLEAN: Only use properties that exist in CartItem
            const cartItem: CartItem = {
              // Basic product info
              id: product.id,
              slug: product.slug,
              name: product.name,
              base_price: product.base_price,
              discounted_price: product.discounted_price,

              // Cart-specific fields
              quantity: product.quantity || 1,
              store_slug: product.store_slug,
              currentPrice: product.currentPrice ?? product.base_price,
              imageUrl: product.imageUrl || product.images?.[0] || "/placeholder.png",

              // Optional fields
              images: product.images || [],
              category: product.category,
              variants: product.variants,
            };

            return { cart: [...state.cart, cartItem] };
          });
          resolve();
        });
      },

      // ... rest of the functions remain the same
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
          // ✅ Use the same price logic
          const displayPrice = item.discounted_price && item.discounted_price > 0
            ? item.discounted_price
            : (item.currentPrice ?? item.base_price);

          return sum + displayPrice * item.quantity;
        }, 0),

      // In your cartStore.ts - update the totalPriceByStore function
      totalPriceByStore: (store_slug) =>
        get().cart
          .filter((item) => item.store_slug === store_slug)
          .reduce((sum, item) => {
            // ✅ Use the same price logic as in CartItemsList
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