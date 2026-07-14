import { supabase } from "@/lib/supabase";
import type { VendorListSummary } from "@/lib/types/vendor/type";

// Batched version of getVendorDashboardStats for a page of vendor rows —
// one round trip per source table (regardless of how many vendor ids are
// passed) instead of N*4, so the vendors list can show due/stock at a
// glance without a query storm.
export async function getVendorsSummaryByIds(
  vendorIds: string[],
): Promise<Map<string, VendorListSummary>> {
  const summary = new Map<string, VendorListSummary>();
  if (vendorIds.length === 0) return summary;

  const [stockRes, settlementsRes, paymentsRes] = await Promise.all([
    supabase
      .from("vendor_stock")
      .select("vendor_id, quantity_available, last_vendor_tp")
      .in("vendor_id", vendorIds),
    supabase
      .from("vendor_settlements")
      .select("vendor_id, total_receivable")
      .in("vendor_id", vendorIds),
    supabase
      .from("vendor_payments")
      .select("vendor_id, amount, payment_date")
      .in("vendor_id", vendorIds)
      .order("payment_date", { ascending: false }),
  ]);

  if (stockRes.error) console.error("Error fetching vendor stock summary:", stockRes.error.message);
  if (settlementsRes.error) console.error("Error fetching vendor settlements summary:", settlementsRes.error.message);
  if (paymentsRes.error) console.error("Error fetching vendor payments summary:", paymentsRes.error.message);

  const stockQtyByVendor = new Map<string, number>();
  const stockValueByVendor = new Map<string, number>();
  for (const row of stockRes.data ?? []) {
    stockQtyByVendor.set(row.vendor_id, (stockQtyByVendor.get(row.vendor_id) ?? 0) + row.quantity_available);
    stockValueByVendor.set(
      row.vendor_id,
      (stockValueByVendor.get(row.vendor_id) ?? 0) + row.quantity_available * Number(row.last_vendor_tp ?? 0),
    );
  }

  const receivableByVendor = new Map<string, number>();
  for (const row of settlementsRes.data ?? []) {
    receivableByVendor.set(row.vendor_id, (receivableByVendor.get(row.vendor_id) ?? 0) + Number(row.total_receivable));
  }

  const paidByVendor = new Map<string, number>();
  const lastPaymentByVendor = new Map<string, string>();
  for (const row of paymentsRes.data ?? []) {
    paidByVendor.set(row.vendor_id, (paidByVendor.get(row.vendor_id) ?? 0) + Number(row.amount));
    // Rows arrive newest-first, so the first one seen per vendor is the latest.
    if (!lastPaymentByVendor.has(row.vendor_id)) lastPaymentByVendor.set(row.vendor_id, row.payment_date);
  }

  for (const vendorId of vendorIds) {
    const receivable = receivableByVendor.get(vendorId) ?? 0;
    const paid = paidByVendor.get(vendorId) ?? 0;
    summary.set(vendorId, {
      vendor_id: vendorId,
      stock_quantity: stockQtyByVendor.get(vendorId) ?? 0,
      stock_value: stockValueByVendor.get(vendorId) ?? 0,
      current_due: receivable - paid,
      last_payment_date: lastPaymentByVendor.get(vendorId) ?? null,
    });
  }

  return summary;
}
