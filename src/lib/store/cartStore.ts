import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState } from "../types/cart";

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
            return {
              cart: [...state.cart, { ...product, quantity: 1 }],
            };
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
            item.id === id
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

      totalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().cart.reduce(
          (sum, item) => sum + item.currentPrice * item.quantity,
          0
        ),
    }),
    {
      name: "cart-storage",
    }
  )
);

export default useCartStore;