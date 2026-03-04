// ─── Payment Method ───────────────────────────────────────────────────────────

export type PaymentMethodKey =
  | "cash"
  | "card"
  | "bank_transfer"
  | "online"
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
  bank_transfer: { color: "#7c3aed", bg: "#ede9fe", label: "Bank Transfer" },
  online: { color: "#0891b2", bg: "#cffafe", label: "Online" },
  check: { color: "#d97706", bg: "#fef3c7", label: "Check" },
};

export function isPaymentMethodKey(value: string): value is PaymentMethodKey {
  return value in PAYMENT_METHOD_CONFIG;
}
