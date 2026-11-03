// ─── Payment Method ───────────────────────────────────────────────────────────

export type PaymentMethodKey =
  | "cash"
  | "card"
  | "bank_transfer"
  | "mobile_banking"
  | "online"
  | "other"
  | "check";

export interface PaymentMethodConfig {
  color: string;
  bg: string;
  label: string;
}

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethodKey,
  PaymentMethodConfig
> = {
  cash: { color: "#16a34a", bg: "#dcfce7", label: "Cash" },
  card: { color: "#2563eb", bg: "#dbeafe", label: "Card" },
  bank_transfer: { color: "#7c3aed", bg: "#ede9fe", label: "Bank / Card" },
  mobile_banking: { color: "#db2777", bg: "#fce7f3", label: "Mobile banking (bKash, Nagad)" },
  online: { color: "#0891b2", bg: "#cffafe", label: "Online" },
  check: { color: "#d97706", bg: "#fef3c7", label: "Check" },
  other: { color: "#64748b", bg: "#f1f5f9", label: "Other" },
};

export function isPaymentMethodKey(value: string): value is PaymentMethodKey {
  return value in PAYMENT_METHOD_CONFIG;
}
