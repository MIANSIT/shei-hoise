import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import type { VendorDashboardStats } from "@/lib/types/vendor/type";

const SLOW_MOVING_DAYS = 30;

export async function getVendorDashboardStats(
  vendorId: string,
): Promise<VendorDashboardStats> {
  const empty: VendorDashboardStats = {
    vendor_id: vendorId,
    current_stock_count: 0,
    total_dispatched: 0,
    total_sold: 0,
    total_returned: 0,
    total_receivable: 0,
    total_paid: 0,
    current_due: 0,
    last_payment_date: null,
    margin_dispatched: 0,
    slow_moving_count: 0,
  };

  if (!vendorId) return empty;

  const [stockRes, ordersRes, orderItemsRes, settlementItemsRes, paymentsRes] =
    await Promise.all([
      supabase
        .from("vendor_stock")
        .select("quantity_available, updated_at")
        .eq("vendor_id", vendorId),
      supabase
        .from("vendor_orders")
        .select("total_quantity")
        .eq("vendor_id", vendorId)
        .eq("status", "confirmed"),
      supabase
        .from("vendor_order_items")
        .select(
          "quantity, original_tp, vendor_tp, order:vendor_orders!inner(vendor_id, status)",
        )
        .eq("order.vendor_id", vendorId)
        .eq("order.status", "confirmed"),
      supabase
        .from("vendor_settlement_items")
        .select(
          "sold_quantity, returned_quantity, receivable_amount, settlement:vendor_settlements!inner(vendor_id)",
        )
        .eq("settlement.vendor_id", vendorId),
      supabase
        .from("vendor_payments")
        .select("amount, payment_date")
        .eq("vendor_id", vendorId)
        .order("payment_date", { ascending: false }),
    ]);

  const stockRows = stockRes.data ?? [];
  const currentStock = stockRows.reduce((sum, r) => sum + r.quantity_available, 0);
  const slowMovingCutoff = dayjs().subtract(SLOW_MOVING_DAYS, "day");
  const slowMovingCount = stockRows.filter(
    (r) => r.quantity_available > 0 && dayjs(r.updated_at).isBefore(slowMovingCutoff),
  ).length;

  const totalDispatched = (ordersRes.data ?? []).reduce(
    (sum, r) => sum + r.total_quantity,
    0,
  );
  const marginDispatched = (orderItemsRes.data ?? []).reduce(
    (sum, r) => sum + r.quantity * (Number(r.vendor_tp) - Number(r.original_tp)),
    0,
  );
  const settlementItems = settlementItemsRes.data ?? [];
  const totalSold = settlementItems.reduce((sum, r) => sum + r.sold_quantity, 0);
  const totalReturned = settlementItems.reduce(
    (sum, r) => sum + r.returned_quantity,
    0,
  );
  const totalReceivable = settlementItems.reduce(
    (sum, r) => sum + Number(r.receivable_amount),
    0,
  );
  const payments = paymentsRes.data ?? [];
  const totalPaid = payments.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    vendor_id: vendorId,
    current_stock_count: currentStock,
    total_dispatched: totalDispatched,
    total_sold: totalSold,
    total_returned: totalReturned,
    total_receivable: totalReceivable,
    total_paid: totalPaid,
    current_due: totalReceivable - totalPaid,
    last_payment_date: payments[0]?.payment_date ?? null,
    margin_dispatched: marginDispatched,
    slow_moving_count: slowMovingCount,
  };
}
