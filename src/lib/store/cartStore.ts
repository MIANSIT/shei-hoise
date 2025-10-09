import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState, CartItem } from "../types/cart";

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product) => {
        return new Promise<void>((resolve) => {
          set((state) => {
            const existing = state.cart.find((item) => item.id === product.id);
            if (existing) {
              return {
                cart: state.cart.map((item) =>
                  item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                ),
              };
            }

            const variant = product.variants?.[0];

            const cartItem: CartItem = {
              ...product,
              quantity: 1,
              currentPrice:
                variant?.discounted_price && variant.discounted_price > 0
                  ? variant.discounted_price
                  : variant?.base_price ?? product.discounted_price ?? product.base_price,
              imageUrl:
                variant?.primary_image?.image_url ||
                variant?.product_images?.[0]?.image_url ||
                product.primary_image?.image_url ||
                product.images?.[0] ||
                "/placeholder.png",
            };

            return { cart: [...state.cart, cartItem] };
          });
          resolve();
        });
      },

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

      totalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().cart.reduce(
          (sum, item) => sum + (item.currentPrice ?? item.base_price) * item.quantity,
          0
        ),
    }),
    {
      name: "cart-storage",
    }
  )
);

export default useCartStore;
