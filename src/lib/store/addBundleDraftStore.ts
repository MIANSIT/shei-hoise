import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { BundleType } from "@/lib/schema/bundleSchema";

interface AddBundleDraftState {
  _hasHydrated: boolean;
  formValues: Partial<BundleType> | null;
  setHasHydrated: (value: boolean) => void;
  setFormValues: (values: Partial<BundleType>) => void;
  clearDraft: () => void;
}

const safeLocalStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      try {
        const parsed = JSON.parse(value) as {
          state?: { formValues?: { images?: unknown } };
        };
        if (parsed?.state?.formValues) {
          parsed.state.formValues = { ...parsed.state.formValues, images: [] };
        }
        localStorage.setItem(name, JSON.stringify(parsed));
      } catch {
        localStorage.removeItem(name);
      }
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const useAddBundleDraftStore = create<AddBundleDraftState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      formValues: null,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setFormValues: (values) => set({ formValues: values }),
      clearDraft: () => set({ formValues: null }),
    }),
    {
      name: "add-bundle-draft",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        formValues: state.formValues,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
