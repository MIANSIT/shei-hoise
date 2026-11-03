import { create } from "zustand";

/** One line the Reorder List hands to Receive stock. */
export interface ReceiveDraftLine {
  productId: string;
  variantId: string | null;
  /** "Shirt — Large" for a variant. */
  label: string;
  quantity: number;
  /** Units in stock now. */
  stock: number;
  /** Cost of one unit now; 0 when it was never set. */
  unitCost: number;
}

/** What to pre-fill on the Receive stock page. */
export interface ReceiveDraft {
  supplierId: string;
  lines: ReceiveDraftLine[];
}

interface ReceiveDraftState {
  draft: ReceiveDraft | null;
  setDraft: (draft: ReceiveDraft) => void;
  clearDraft: () => void;
}

/**
 * A one-time hand-over from the Reorder List to Receive stock, so a planned
 * order is received (and billed) only when the goods arrive. Kept in memory
 * only: reloading the page drops it.
 */
export const useReceiveDraftStore = create<ReceiveDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
