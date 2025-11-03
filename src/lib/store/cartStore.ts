import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState, CartItem } from "../types/cart";
import { AddToCartType } from "../schema/checkoutSchema"; 

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product: AddToCartType) => {
        return new Promise<void>((resolve) => {
          set((state) => {
            // Find existing item with same product ID AND variant ID AND storeSlug
            const existing = state.cart.find(
              (item) => 
                item.productId === product.productId && 
                item.variantId === product.variantId &&
                item.storeSlug === product.storeSlug
            );

            if (existing) {
              return {
                cart: state.cart.map((item) =>
                  item.productId === product.productId && 
                  item.variantId === product.variantId && 
                  item.storeSlug === product.storeSlug
                    ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                    : item
                ),
              };
            }

            // Store minimal cart data
            const cartItem: CartItem = {
              productId: product.productId,
              storeSlug: product.storeSlug,
              quantity: product.quantity || 1,
              variantId: product.variantId,
            };

            return { cart: [...state.cart, cartItem] };
          });
          resolve();
        });
      },

      // FIXED: Remove specific item by productId AND variantId
      removeItem: (productId: string, variantId?: string | null) =>
        set((state) => ({
          cart: state.cart.filter((item) => 
            !(item.productId === productId && item.variantId === variantId)
          ),
        })),

      updateQuantity: (productId: string, variantId: string | null | undefined, quantity: number) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

      clearStoreCart: (storeSlug: string) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.storeSlug !== storeSlug),
        })),

      getCartByStore: (storeSlug: string) => {
        return get().cart.filter((item) => item.storeSlug === storeSlug);
      },

      totalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),

      totalItemsByStore: (storeSlug: string) =>
        get().cart
          .filter((item) => item.storeSlug === storeSlug)
          .reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "cart-storage",
    }
  )
);

export default useCartStore;