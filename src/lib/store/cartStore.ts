import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState } from "../types/cart";

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product) =>
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
        }),

      clearCart: () => set({ cart: [] }),

      totalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().cart.reduce(
          (sum, item) => sum + item?.currentPrice * item.quantity,
          0
        ),
    }),
    {
      name: "cart-storage", // key in localStorage
    }
  )
);

export default useCartStore;
