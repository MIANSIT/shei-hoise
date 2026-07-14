import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CustomerInfo, OrderProduct } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";

/**
 * Snapshot of everything a user can fill in on the create order screen.
 * Kept as one flat object so it's trivial to persist and restore.
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
