import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { ProductType } from "@/lib/schema/productSchema";

interface AddProductDraftState {
  /** True once the store has finished reading from localStorage */
  _hasHydrated: boolean;
  formValues: Partial<ProductType> | null;
  priceMode: "percentage" | "multiplier";
  priceValue: number | null;
  setHasHydrated: (value: boolean) => void;
  setFormValues: (values: Partial<ProductType>) => void;
  setPriceMode: (mode: "percentage" | "multiplier") => void;
  setPriceValue: (value: number | null) => void;
  clearDraft: () => void;
}

/**
 * Safe localStorage wrapper that gracefully handles QuotaExceededError.
 * Images are stored as base64 data URLs and can be large — if the total
 * draft exceeds the ~5MB localStorage limit, we fall back to saving
 * everything except images so the rest of the draft is never lost.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // QuotaExceededError: retry without images
      try {
        const parsed = JSON.parse(value) as {
          state?: { formValues?: { images?: unknown } };
        };
        if (parsed?.state?.formValues) {
          parsed.state.formValues = { ...parsed.state.formValues, images: [] };
        }
        localStorage.setItem(name, JSON.stringify(parsed));
      } catch {
        // If it still fails, clear the key so stale data doesn't block the app
        localStorage.removeItem(name);
      }
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const useAddProductDraftStore = create<AddProductDraftState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      formValues: null,
      priceMode: "percentage",
      priceValue: null,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setFormValues: (values) => set({ formValues: values }),
      setPriceMode: (mode) => set({ priceMode: mode }),
      setPriceValue: (value) => set({ priceValue: value }),
      clearDraft: () =>
        set({ formValues: null, priceMode: "percentage", priceValue: null }),
    }),
    {
      name: "add-product-draft",
      // createJSONStorage is required in Zustand v5 for custom storage adapters
      storage: createJSONStorage(() => safeLocalStorage),
      // Exclude internal hydration flag from localStorage
      partialize: (state) => ({
        formValues: state.formValues,
        priceMode: state.priceMode,
        priceValue: state.priceValue,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
