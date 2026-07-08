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
  /**
   * The order's own `updated_at` at the moment this draft was captured —
   * edit drafts only (a brand-new create-order draft has no server record
   * to compare against). Lets a stale draft be told apart from one that's
   * still safe to restore: if the real order's `updated_at` has since
   * moved on (another admin edited it, a courier webhook updated its
   * status, etc.), restoring this draft would silently revert real data,
   * so it should be discarded instead of reapplied.
   */
  orderUpdatedAt?: string;
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
      // Bumped once to wipe every existing stored draft — drafts saved
      // before the fetchCustomerProfile-overwrite fix could contain a
      // customer's profile address instead of the order's real one, and
      // would otherwise still restore silently for any order that hasn't
      // changed since. Without an explicit migrate function, a version
      // mismatch alone doesn't discard anything — zustand just logs a
      // warning and keeps the old stored data — so this migrate function
      // is what actually does the wipe.
      version: 1,
      migrate: () => ({ drafts: {} }),
    },
  ),
);
