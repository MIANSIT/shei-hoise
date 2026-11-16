import { PaymentMethod } from "@/lib/types/enums";
import { PAYMENT_LABELS } from "./paymentLabels";

/** One part of a split payment: how much came in by one method. */
export interface PaymentSplitPart {
  method: string;
  amount: number;
}

/** The methods a split sale can be paid by — the same three balances Quick Sale offers. */
export const SPLIT_METHODS: readonly string[] = [
  PaymentMethod.CASH,
  PaymentMethod.MOBILE_BANKING,
  PaymentMethod.BANK_TRANSFER,
];

/**
 * A stored orders.payment_split value as clean parts (allowed method, amount > 0, one part per method),
 * or null when it is missing or unusable.
 */
export function parsePaymentSplit(raw: unknown): PaymentSplitPart[] | null {
  if (!Array.isArray(raw)) return null;
  const byMethod = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { method, amount } = item as { method?: unknown; amount?: unknown };
    const value = Number(amount);
    if (typeof method !== "string" || !SPLIT_METHODS.includes(method) || !(value > 0)) continue;
    byMethod.set(method, (byMethod.get(method) ?? 0) + value);
  }
  const parts = [...byMethod.entries()].map(([method, amount]) => ({ method, amount }));
  return parts.length > 0 ? parts : null;
}

/**
 * How an amount of an order's money divides between payment methods. A split order shares it out in the same
 * proportion as its parts (so its product-only share, or a total edited later, still divides correctly); any other
 * order puts it all on its one method. The shares always add up to `amount` exactly.
 */
export function shareByMethod(
  paymentMethod: string | null | undefined,
  paymentSplit: unknown,
  amount: number,
): { method: string | null; amount: number }[] {
  const parts = paymentMethod === PaymentMethod.SPLIT ? parsePaymentSplit(paymentSplit) : null;
  const partsTotal = parts?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  if (!parts || !(partsTotal > 0)) return [{ method: paymentMethod ?? null, amount }];

  let given = 0;
  return parts.map((part, index) => {
    // The last share takes whatever rounding left over.
    const share =
      index === parts.length - 1 ? amount - given : Math.round((amount * part.amount * 100) / partsTotal) / 100;
    given += share;
    return { method: part.method, amount: share };
  });
}

/**
 * The order's payment method as people read it: "Cash 500.00 + Mobile Banking 300.00" for a split order (no
 * currency sign, so it prints in every invoice font), otherwise the method's label.
 */
export function paymentMethodSummary(
  paymentMethod: string | null | undefined,
  paymentSplit: unknown,
): string {
  if (!paymentMethod) return "";
  const parts = paymentMethod === PaymentMethod.SPLIT ? parsePaymentSplit(paymentSplit) : null;
  if (parts) {
    return parts.map((p) => `${PAYMENT_LABELS[p.method] || p.method} ${p.amount.toFixed(2)}`).join(" + ");
  }
  return PAYMENT_LABELS[paymentMethod] || paymentMethod;
}
