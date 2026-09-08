import { PaymentMethod } from "@/lib/types/enums";

/** Display labels for a persisted order's payment_method — shared by Quick Sale's checkout receipt and the reprint-from-order path (receiptFromOrder.ts), so both spell the same method the same way. */
export const PAYMENT_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.MOBILE_BANKING]: "Mobile Banking",
};
