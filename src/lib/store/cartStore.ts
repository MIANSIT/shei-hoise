import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState, CartItem } from "../types/cart";
import { AddToCartType } from "../schema/checkoutSchema";

// Two bundle lines for the same product can carry different choice-group
// picks (e.g. Adult vs Kitten flavor) — they must never be treated as the
// same cart line just because productId/variantId match. Empty/absent
// selections all normalize to the same "no selection" key.
const selectionsKey = (selections?: Record<string, string> | null) =>
  selections && Object.keys(selections).length > 0
    ? JSON.stringify(Object.entries(selections).sort())
    : null;

const sameLine = (
  item: CartItem,
  productId: string,
  variantId: string | null | undefined,
  storeSlug: string,
  bundleSelections?: Record<string, string> | null
) =>
  item.productId === productId &&
  item.variantId === variantId &&
  item.storeSlug === storeSlug &&
  selectionsKey(item.bundleSelections) === selectionsKey(bundleSelections);

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product: AddToCartType) => {
        set((state) => {
          const existing = state.cart.find((item) =>
            sameLine(
              item,
              product.productId,
              product.variantId,
              product.storeSlug,
              product.bundleSelections
            )
          );

          if (existing) {
            return {
              cart: state.cart.map((item) =>
                sameLine(
                  item,
                  product.productId,
                  product.variantId,
                  product.storeSlug,
                  product.bundleSelections
                )
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
            bundleSelections: product.bundleSelections ?? null,
          };

          return { cart: [...state.cart, cartItem] };
        });
      },

      // Remove specific item by productId AND variantId (AND bundleSelections,
      // so two bundle lines with different picks don't collide).
      removeItem: (
        productId: string,
        variantId?: string | null,
        bundleSelections?: Record<string, string> | null
      ) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) => !sameLine(item, productId, variantId, item.storeSlug, bundleSelections)
          ),
        })),

      updateQuantity: (
        productId: string,
        variantId: string | null | undefined,
        quantity: number,
        bundleSelections?: Record<string, string> | null
      ) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            sameLine(item, productId, variantId, item.storeSlug, bundleSelections)
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
