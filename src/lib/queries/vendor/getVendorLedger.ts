import { supabase } from "@/lib/supabase";
import type { VendorLedgerEntry } from "@/lib/types/vendor/type";

// Vendor Ledger is a read-time merge of three independent histories
// (dispatches, settlements, payments) rather than a maintained ledger
// table — avoids a dual-write consistency problem, and each source table
// already has everything needed to reconstruct chronology.
export async function getVendorLedger(
  vendorId: string,
): Promise<VendorLedgerEntry[]> {
  const [ordersRes, settlementsRes, paymentsRes] = await Promise.all([
    supabase
      .from("vendor_orders")
      .select("id, invoice_number, order_date, total_quantity, grand_total")
      .eq("vendor_id", vendorId)
      .eq("status", "confirmed")
      .order("order_date", { ascending: false }),
    supabase
      .from("vendor_settlements")
      .select(
        "id, settlement_date, total_receivable, items:vendor_settlement_items(sold_quantity, returned_quantity)",
      )
      .eq("vendor_id", vendorId)
      .order("settlement_date", { ascending: false }),
    supabase
      .from("vendor_payments")
      .select("id, payment_date, amount, payment_method, notes")
      .eq("vendor_id", vendorId)
      .order("payment_date", { ascending: false }),
  ]);

  const entries: VendorLedgerEntry[] = [];

  for (const order of ordersRes.data ?? []) {
    entries.push({
      type: "dispatch",
      date: order.order_date,
      reference: order.invoice_number,
      description: `Dispatched ${order.total_quantity} unit(s) to vendor`,
      quantity: order.total_quantity,
    });
  }

  for (const settlement of settlementsRes.data ?? []) {
    const items = (settlement.items ?? []) as {
      sold_quantity: number;
      returned_quantity: number;
    }[];
    const sold = items.reduce((sum, i) => sum + i.sold_quantity, 0);
    const returned = items.reduce((sum, i) => sum + i.returned_quantity, 0);
    entries.push({
      type: "settlement",
      date: settlement.settlement_date,
      reference: settlement.id.slice(0, 8),
      description: `Settled: ${sold} sold, ${returned} returned`,
      quantity: sold + returned,
      receivable: settlement.total_receivable,
    });
  }

  for (const payment of paymentsRes.data ?? []) {
    entries.push({
      type: "payment",
      date: payment.payment_date,
      reference: payment.id.slice(0, 8),
      description: payment.notes || "Payment received",
      paid: payment.amount,
      paymentMethod: payment.payment_method,
    });
  }

  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}
