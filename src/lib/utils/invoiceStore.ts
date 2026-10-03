import type { InvoicePdfStore } from "@/lib/utils/invoicePdfHelpers";

/** The store details an invoice header needs (a subset of StoreInvoiceData). */
export interface InvoiceStoreSource {
  store_name: string;
  business_address?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

/** The parts of a branch printed on invoices and receipts. */
export interface InvoiceBranch {
  name: string;
  address: string | null;
  phone: string | null;
}

/**
 * The header for an order's invoice. Stores with branches print the branch
 * that fulfilled the order — "Store — Branch", with the branch's own address
 * and phone, falling back to the store's when the branch has none. Without a
 * branch it's the store as before.
 */
export function invoiceStoreFor(store: InvoiceStoreSource, branch?: InvoiceBranch | null): InvoicePdfStore {
  return {
    name: branch ? `${store.store_name} — ${branch.name}` : store.store_name,
    address: branch?.address || store.business_address || null,
    phone: branch?.phone || store.contact_phone || null,
    email: store.contact_email ?? null,
  };
}

/** Extra lines under the store name on a thermal receipt: branch, address, phone. */
export function branchReceiptLines(branch?: InvoiceBranch | null): string[] {
  if (!branch) return [];
  return [branch.name, branch.address, branch.phone ? `Tel: ${branch.phone}` : null].filter(
    (line): line is string => !!line,
  );
}
