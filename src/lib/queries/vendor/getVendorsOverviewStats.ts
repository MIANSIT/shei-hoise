import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import type { VendorsOverviewStats } from "@/lib/types/vendor/type";

const SLOW_MOVING_DAYS = 30;

const EMPTY: VendorsOverviewStats = {
  total_vendors: 0,
  total_receivable: 0,
  total_paid: 0,
  total_due: 0,
  total_stock_value: 0,
  collected_this_week: 0,
  collected_this_month: 0,
  total_margin_dispatched: 0,
  slow_moving_stock_value: 0,
};

// Store-wide vendor business summary for the Vendors dashboard header —
// total money out on the street, total stock in vendors' hands, and recent
// collection pace. Scoped by store_id directly on each table rather than
// going through a vendor id list first, since every vendor table already
// carries store_id for tenant isolation.
export async function getVendorsOverviewStats(
  storeId: string,
): Promise<VendorsOverviewStats> {
  if (!storeId) return EMPTY;

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const slowMovingCutoff = dayjs().subtract(SLOW_MOVING_DAYS, "day");

  const [vendorCountRes, stockRes, settlementsRes, paymentsRes, orderItemsRes] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "active"),
      supabase
        .from("vendor_stock")
        .select("quantity_available, last_vendor_tp, updated_at")
        .eq("store_id", storeId),
      supabase
        .from("vendor_settlements")
        .select("total_receivable")
        .eq("store_id", storeId),
      supabase
        .from("vendor_payments")
        .select("amount, payment_date")
        .eq("store_id", storeId),
      supabase
        .from("vendor_order_items")
        .select(
          "quantity, original_tp, vendor_tp, order:vendor_orders!inner(store_id, status)",
        )
        .eq("order.store_id", storeId)
        .eq("order.status", "confirmed"),
    ]);

  const stockRows = stockRes.data ?? [];
  const totalStockValue = stockRows.reduce(
    (sum, r) => sum + r.quantity_available * Number(r.last_vendor_tp ?? 0),
    0,
  );
  const slowMovingStockValue = stockRows
    .filter((r) => r.quantity_available > 0 && dayjs(r.updated_at).isBefore(slowMovingCutoff))
    .reduce((sum, r) => sum + r.quantity_available * Number(r.last_vendor_tp ?? 0), 0);

  const totalReceivable = (settlementsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total_receivable),
    0,
  );
  const payments = paymentsRes.data ?? [];
  const totalPaid = payments.reduce((sum, r) => sum + Number(r.amount), 0);
  const collectedThisWeek = payments
    .filter((p) => p.payment_date >= weekStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const collectedThisMonth = payments
    .filter((p) => p.payment_date >= monthStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalMarginDispatched = (orderItemsRes.data ?? []).reduce(
    (sum, r) => sum + r.quantity * (Number(r.vendor_tp) - Number(r.original_tp)),
    0,
  );

  return {
    total_vendors: vendorCountRes.count ?? 0,
    total_receivable: totalReceivable,
    total_paid: totalPaid,
    total_due: totalReceivable - totalPaid,
    total_stock_value: totalStockValue,
    collected_this_week: collectedThisWeek,
    collected_this_month: collectedThisMonth,
    total_margin_dispatched: totalMarginDispatched,
    slow_moving_stock_value: slowMovingStockValue,
  };
}
