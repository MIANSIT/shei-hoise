import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CustomerInfo, OrderProduct } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";

/**
 * Snapshot of everything a user can fill in on the create/edit order
 * screens. Kept as one flat object so it's trivial to persist and restore.
 */
export interface OrderDraftData {
  orderId: string;
  customerInfo: CustomerInfo;
  orderProducts: OrderProduct[];
  discount: number;
  additionalCharges: number;
  deliveryCost: number;
  taxAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  courier: string;
}

/* =======================
   CREATE ORDER DRAFT
   Only one new order can be drafted at a time per browser, so this is a
   single slot (no key needed).
======================= */
interface CreateOrderDraftState {
  /** True once the store has finished reading from localStorage */
  _hasHydrated: boolean;
  draft: OrderDraftData | null;
  setHasHydrated: (value: boolean) => void;
  setDraft: (data: OrderDraftData) => void;
  clearDraft: () => void;
}

export const useCreateOrderDraftStore = create<CreateOrderDraftState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      draft: null,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setDraft: (data) => set({ draft: data }),
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: "create-order-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/* =======================
   EDIT ORDER DRAFT
   Multiple orders can be edited over time, so drafts are keyed by order
   number. Each one is cleared once the update is saved successfully.
======================= */
interface EditOrderDraftState {
  _hasHydrated: boolean;
  drafts: Record<string, OrderDraftData>;
  setHasHydrated: (value: boolean) => void;
  setDraft: (orderNumber: string, data: OrderDraftData) => void;
  getDraft: (orderNumber: string) => OrderDraftData | undefined;
  clearDraft: (orderNumber: string) => void;
}

export const useEditOrderDraftStore = create<EditOrderDraftState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      drafts: {},
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setDraft: (orderNumber, data) =>
        set((state) => ({
          drafts: { ...state.drafts, [orderNumber]: data },
        })),
      getDraft: (orderNumber) => get().drafts[orderNumber],
      clearDraft: (orderNumber) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[orderNumber];
          return { drafts: next };
        }),
    }),
    {
      name: "edit-order-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ drafts: state.drafts }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
