/** One line of a delivery: what arrived and what one unit cost on the supplier's bill. */
export interface ReceivePurchaseItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  /** Cost of one unit, at most 2 decimals. */
  unitCost: number;
}

/** A delivery from one supplier. Receiving it adds the stock, updates the cost and creates the bill. */
export interface ReceivePurchaseInput {
  supplierId: string;
  /** Stores with branches: the branch that received the stock. */
  branchId?: string | null;
  /** The number printed on the supplier's bill; the same number twice for one supplier is refused. */
  billNo?: string;
  /** YYYY-MM-DD */
  purchaseDate: string;
  /** YYYY-MM-DD */
  dueDate?: string | null;
  note?: string;
  /** Photo of the paper bill. */
  attachmentUrl?: string | null;
  items: ReceivePurchaseItemInput[];
  /** Paid to the supplier right now; the rest stays as Accounts payable. */
  paidAmount?: number;
  paymentMethod?: "cash" | "mobile_banking" | "card" | "bank_transfer" | "online" | "other";
  /** "shop" = the shop's own money, "outside" = an investor or the owner's pocket. */
  paidFrom?: "shop" | "outside";
}

export type ReceivePurchaseResult =
  | { success: true; purchaseId: string; total: number; billAmount: number; paidAmount: number }
  | { success: false; error: string };
