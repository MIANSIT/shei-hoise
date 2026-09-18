import { PaymentMethod } from "@/lib/types/enums";

/** Display labels for a persisted order's payment_method — shared by Quick Sale's checkout receipt, the reprint-from-order path (receiptFromOrder.ts), and Register Audit's "collected by method" breakdown, so every surface spells the same method the same way instead of falling back to a raw enum string like "cod". */
export const PAYMENT_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.MOBILE_BANKING]: "Mobile Banking",
  [PaymentMethod.COD]: "Cash on Delivery",
  [PaymentMethod.ONLINE]: "Online Payment",
  [PaymentMethod.BANK_TRANSFER]: "Bank Transfer",
  // Pre-existing orders recorded before Create/Edit Order was unified onto
  // the shared PaymentMethod enum — kept only so old rows still show a
  // readable label instead of the raw string; no longer offered as an
  // option anywhere.
  bkash: "Mobile Banking (bKash)",
  nagad: "Mobile Banking (Nagad)",
};
