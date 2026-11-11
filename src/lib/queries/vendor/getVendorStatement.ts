import { supabase } from "@/lib/supabase";
import { getVendorInvoiceBalances } from "./getVendorInvoiceBalances";
import { getVendorDashboardStats } from "./getVendorDashboardStats";

export interface VendorStatementInvoiceItem {
  product: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface VendorStatementInvoice {
  invoiceNumber: string;
  date: string;
  items: VendorStatementInvoiceItem[];
  /** Product lines added up. */
  goods: number;
  discount: number;
  delivery: number;
  /** goods − discount + delivery. */
  total: number;
  /** What this invoice has paid (never more than its total) and what is left. */
  paid: number;
  due: number;
  deliveryPaid: number;
  deliveryDue: number;
}

export interface VendorStatementReturn {
  date: string;
  product: string;
  quantity: number;
  rate: number;
  /** What it takes off the vendor's balance. */
  amount: number;
  /** "unsold": stock the vendor gave back when settling. "after_sale": goods taken back after they were sold. */
  kind: "unsold" | "after_sale";
}

export interface VendorStatementPayment {
  date: string;
  method: string;
  amount: number;
  /** "Invoice INV-1 · Delivery charge", "Invoice INV-1" or "General (oldest invoice first)". */
  appliedTo: string;
  note: string | null;
}

export interface VendorStatementData {
  invoices: VendorStatementInvoice[];
  returns: VendorStatementReturn[];
  payments: VendorStatementPayment[];
  totals: {
    billed: number;
    returned: number;
    paid: number;
    deliveryBilled: number;
    deliveryPaid: number;
    deliveryDue: number;
  };
  /** The vendor's current due, the same number the vendor page shows. */
  currentDue: number;
  /**
   * What is needed to make billed − returned − paid equal the current due (for example invoice discounts, or a
   * product dispatched at different prices). Zero when they agree. Shown on the statement so a gap is never hidden.
   */
  adjustment: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface SettlementItemRow {
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
  receivable_amount: number;
  products: { name: string } | { name: string }[] | null;
  product_variants: { variant_name: string | null } | { variant_name: string | null }[] | null;
}

const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/**
 * Everything the vendor statement shows, invoice by invoice: what was billed (products, delivery, discount), what the
 * vendor paid against each invoice, the goods that came back, and every payment. Built from the same sources as the
 * vendor page, so the balance matches what you see there.
 */
export async function getVendorStatement(vendorId: string): Promise<VendorStatementData> {
  const [balances, stats, settlementsRes] = await Promise.all([
    getVendorInvoiceBalances(vendorId),
    getVendorDashboardStats(vendorId),
    supabase
      .from("vendor_settlements")
      .select(
        "id, settlement_date, total_receivable, items:vendor_settlement_items(sold_quantity, returned_quantity, unit_price, receivable_amount, products(name), product_variants(variant_name))",
      )
      .eq("vendor_id", vendorId)
      .order("settlement_date", { ascending: true }),
  ]);

  // Before migration 20261212 the applies_to column does not exist: read the payments without it.
  type PaymentRow = {
    payment_date: string;
    amount: number;
    payment_method: string | null;
    notes: string | null;
    vendor_order_id: string | null;
    applies_to?: string | null;
  };
  let paymentRows: PaymentRow[] = [];
  const withType = await supabase
    .from("vendor_payments")
    .select("payment_date, amount, payment_method, notes, vendor_order_id, applies_to")
    .eq("vendor_id", vendorId)
    .order("payment_date", { ascending: true });
  if (withType.error) {
    const plain = await supabase
      .from("vendor_payments")
      .select("payment_date, amount, payment_method, notes, vendor_order_id")
      .eq("vendor_id", vendorId)
      .order("payment_date", { ascending: true });
    paymentRows = (plain.data ?? []) as PaymentRow[];
  } else {
    paymentRows = (withType.data ?? []) as PaymentRow[];
  }

  const invoices: VendorStatementInvoice[] = balances.map((b) => ({
    invoiceNumber: b.invoice_number,
    date: b.order_date,
    items: b.items.map((i) => ({
      product: i.product_name,
      quantity: i.quantity,
      rate: Number(i.vendor_tp),
      amount: Number(i.line_total),
    })),
    goods: b.subtotal,
    discount: b.discount_amount,
    delivery: b.delivery_cost,
    total: b.grand_total,
    paid: Math.min(Math.max(b.paid_allocated, 0), b.grand_total),
    due: b.due_remaining,
    deliveryPaid: b.delivery_paid,
    deliveryDue: b.delivery_due,
  }));

  const returns: VendorStatementReturn[] = [];
  for (const settlement of settlementsRes.data ?? []) {
    const isAfterSale = Number(settlement.total_receivable) < 0;
    for (const item of (settlement.items ?? []) as unknown as SettlementItemRow[]) {
      if (!(item.returned_quantity > 0)) continue;
      const productName = one(item.products)?.name ?? "Product";
      const variantName = one(item.product_variants)?.variant_name;
      const rate = Number(item.unit_price);
      returns.push({
        date: settlement.settlement_date,
        product: variantName ? `${productName} (${variantName})` : productName,
        quantity: item.returned_quantity,
        rate,
        // Goods taken back after a sale are credited at the receivable the system recorded for the line.
        amount: round2(isAfterSale ? Math.abs(Number(item.receivable_amount)) : item.returned_quantity * rate),
        kind: isAfterSale ? "after_sale" : "unsold",
      });
    }
  }

  const invoiceNumberById = new Map(balances.map((b) => [b.order_id, b.invoice_number]));
  const payments: VendorStatementPayment[] = paymentRows.map((p) => {
    const invoiceNumber = p.vendor_order_id ? invoiceNumberById.get(p.vendor_order_id) : undefined;
    const part = p.applies_to === "goods" ? " · Goods" : p.applies_to === "delivery" ? " · Delivery charge" : "";
    return {
      date: p.payment_date,
      method: p.payment_method ?? "cash",
      amount: Number(p.amount),
      appliedTo: invoiceNumber ? `Invoice ${invoiceNumber}${part}` : "General (oldest invoice first)",
      note: p.notes,
    };
  });

  const billed = round2(invoices.reduce((sum, i) => sum + i.total, 0));
  const returned = round2(returns.reduce((sum, r) => sum + r.amount, 0));
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const currentDue = round2(stats.current_due);

  return {
    invoices,
    returns,
    payments,
    totals: {
      billed,
      returned,
      paid,
      deliveryBilled: round2(invoices.reduce((sum, i) => sum + i.delivery, 0)),
      deliveryPaid: round2(invoices.reduce((sum, i) => sum + i.deliveryPaid, 0)),
      deliveryDue: round2(invoices.reduce((sum, i) => sum + i.deliveryDue, 0)),
    },
    currentDue,
    adjustment: round2(currentDue - (billed - returned - paid)),
  };
}
