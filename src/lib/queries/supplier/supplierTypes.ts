/** An importer or wholesaler the store buys stock from. */
export interface Supplier {
  id: string;
  name: string;
  /** WhatsApp / phone number as the owner typed it. */
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  /** How many products have this supplier as their default. */
  productCount: number;
}

export interface SupplierInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

/** What the store owes one supplier: bills minus payments. */
export interface SupplierBalance {
  supplierId: string;
  billed: number;
  paid: number;
  /** billed − paid; negative means the supplier owes the store (an overpayment). */
  due: number;
}

export type SupplierEntryKind = "bill" | "payment";

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  kind: SupplierEntryKind;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** Payments only: how it was paid. */
  paymentMethod: string | null;
  note: string | null;
}

export interface SupplierEntryInput {
  supplierId: string;
  kind: SupplierEntryKind;
  amount: number;
  date: string;
  paymentMethod?: string;
  /** Payments only: "shop" = paid from the shop's own money, "outside" = investor or the owner's pocket. */
  paidFrom?: "shop" | "outside";
  /** Payments from the shop's money, stores with branches: the branch it was paid from. */
  branchId?: string | null;
  note?: string;
}

export interface SupplierResult {
  success: boolean;
  error?: string;
}

/**
 * A number ready for a wa.me link: digits only, with Bangladesh's country code
 * added to a local 01XXXXXXXXX number.
 * @returns the digits, or null when there is no usable number
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0") && digits.length === 11) return `88${digits}`;
  return digits;
}
