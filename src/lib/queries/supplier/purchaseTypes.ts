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
  /** A saved draft order this delivery fulfils: it is removed once the delivery is received. */
  fromDraftId?: string | null;
  /** Paid to the supplier right now; the rest stays as Accounts payable. */
  paidAmount?: number;
  paymentMethod?: "cash" | "mobile_banking" | "card" | "bank_transfer" | "online" | "other";
  /** "shop" = the shop's own money, "outside" = an investor or the owner's pocket. */
  paidFrom?: "shop" | "outside";
  /** Stores with branches: the branch whose money paid it. Defaults to the branch that received the stock. */
  paidBranchId?: string | null;
  /** When paidFrom is "outside": who paid, and whether it counts as their capital or a loan to repay. */
  funderId?: string | null;
  funderTreatment?: "capital" | "loan" | null;
  /** More parts of the same payment, each from its own branch, method or investor. They are saved as payments of their own. */
  extraPayments?: {
    amount: number;
    paymentMethod?: "cash" | "mobile_banking" | "card" | "bank_transfer" | "online" | "other";
    paidFrom?: "shop" | "outside";
    branchId?: string | null;
    billBranchId?: string | null;
    funderId?: string | null;
    funderTreatment?: "capital" | "loan" | null;
  }[];
}

export type ReceivePurchaseResult =
  | { success: true; purchaseId: string; total: number; billAmount: number; paidAmount: number; /** Set when the delivery was saved but an extra part of the payment was not. */ warning?: string }
  | { success: false; error: string };

/** A planned delivery saved for later (a draft order). It adds no stock, no cost change and no bill. */
export interface DraftPurchaseInput {
  /** Set when editing an earlier draft. */
  draftId?: string | null;
  supplierId: string;
  branchId?: string | null;
  dueDate?: string | null;
  note?: string;
  items: { productId: string; variantId?: string | null; quantity: number; unitCost: number; label?: string }[];
}

export interface DraftPurchaseSummary {
  id: string;
  supplierId: string;
  supplierName: string;
  branchId: string | null;
  total: number;
  lines: number;
  note: string | null;
  createdAt: string;
}

/** One draft opened for continuing: each line carries the stock and cost as they are today. */
export interface DraftPurchaseDetail {
  id: string;
  supplierId: string;
  branchId: string | null;
  dueDate: string | null;
  note: string | null;
  lines: { productId: string; variantId: string | null; label: string; quantity: number; unitCost: number; stock: number; cost: number | null }[];
}

/** Goods sent back to a supplier. The stock goes down and the supplier's account is credited. */
export interface ReturnToSupplierInput {
  supplierId: string;
  /** Stores with branches: the branch the goods come out of. */
  branchId?: string | null;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  /** What the supplier credits for one unit of each product. */
  items: { productId: string; variantId?: string | null; quantity: number; unitCredit: number }[];
}
