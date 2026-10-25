import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One item the owner added to the reorder list by hand. */
export interface ManualReorderItem {
  /** `productId:variantId` (variantId empty for a product without variants). */
  key: string;
  productId: string;
  variantId: string | null;
  /** Units to order; null means "use the suggested amount, or 1 if there is none". */
  quantity: number | null;
}

interface ReorderListState {
  /** Items added by hand, kept per store so a shared browser never mixes two stores. */
  itemsByStore: Record<string, ManualReorderItem[]>;
  addItems: (storeId: string, items: ReadonlyArray<{ productId: string; variantId: string | null }>) => number;
  setQuantity: (storeId: string, key: string, quantity: number | null) => void;
  remove: (storeId: string, key: string) => void;
  clear: (storeId: string) => void;
}

export const reorderItemKey = (productId: string, variantId: string | null): string =>
  `${productId}:${variantId ?? ""}`;

/**
 * Items the owner picked for the reorder list from the Stock List or the
 * Reorder List search. Saved in this browser; the list that is suggested from
 * sales is always worked out fresh and is not stored.
 */
export const useReorderListStore = create<ReorderListState>()(
  persist(
    (set, get) => ({
      itemsByStore: {},
      addItems: (storeId, items) => {
        const current = get().itemsByStore[storeId] ?? [];
        const known = new Set(current.map((i) => i.key));
        const added: ManualReorderItem[] = [];
        for (const item of items) {
          const key = reorderItemKey(item.productId, item.variantId);
          if (known.has(key)) continue;
          known.add(key);
          added.push({ key, productId: item.productId, variantId: item.variantId, quantity: null });
        }
        if (added.length > 0) {
          set({ itemsByStore: { ...get().itemsByStore, [storeId]: [...current, ...added] } });
        }
        return added.length;
      },
      setQuantity: (storeId, key, quantity) =>
        set({
          itemsByStore: {
            ...get().itemsByStore,
            [storeId]: (get().itemsByStore[storeId] ?? []).map((i) => (i.key === key ? { ...i, quantity } : i)),
          },
        }),
      remove: (storeId, key) =>
        set({
          itemsByStore: {
            ...get().itemsByStore,
            [storeId]: (get().itemsByStore[storeId] ?? []).filter((i) => i.key !== key),
          },
        }),
      clear: (storeId) => set({ itemsByStore: { ...get().itemsByStore, [storeId]: [] } }),
    }),
    { name: "shei-reorder-list" },
  ),
);
