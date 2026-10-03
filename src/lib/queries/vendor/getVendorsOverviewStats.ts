import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import { calculateVendorCurrentDue } from "./calculateVendorDue";
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
//
// Stores with branches, one branch picked: what moved through that branch —
// money it collected and margin on goods it sent out. Stock with vendors and
// the amount due stay vendor-wide: a vendor has one account with the store,
// whichever branch sent the goods.
export async function getVendorsOverviewStats(
  storeId: string,
  branchId?: string | null,
): Promise<VendorsOverviewStats> {
  if (!storeId) return EMPTY;

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const slowMovingCutoff = dayjs().subtract(SLOW_MOVING_DAYS, "day");

  const [vendorCountRes, stockRes, settlementsRes, paymentsRes, orderItemsRes, deliveryCostRes] =
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
        .select(branchId ? "amount, payment_date, branch_id" : "amount, payment_date")
        .eq("store_id", storeId),
      branchId
        ? supabase
            .from("vendor_order_items")
            .select(
              "quantity, original_tp, vendor_tp, order:vendor_orders!inner(store_id, status, branch_id)",
            )
            .eq("order.store_id", storeId)
            .eq("order.status", "confirmed")
            .eq("order.branch_id", branchId)
        : supabase
            .from("vendor_order_items")
            .select(
              "quantity, original_tp, vendor_tp, order:vendor_orders!inner(store_id, status)",
            )
            .eq("order.store_id", storeId)
            .eq("order.status", "confirmed"),
      supabase
        .from("vendor_orders")
        .select("delivery_cost")
        .eq("store_id", storeId)
        .eq("status", "confirmed"),
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
  type PaymentRow = { amount: number; payment_date: string; branch_id?: string | null };
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];
  // The due needs every payment; "collected" is this branch's only.
  const totalPaid = payments.reduce((sum, r) => sum + Number(r.amount), 0);
  const collected = branchId ? payments.filter((p) => p.branch_id === branchId) : payments;
  const collectedThisWeek = collected
    .filter((p) => p.payment_date >= weekStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const collectedThisMonth = collected
    .filter((p) => p.payment_date >= monthStart)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  type ItemRow = { quantity: number; original_tp: number; vendor_tp: number };
  const totalMarginDispatched = ((orderItemsRes.data ?? []) as unknown as ItemRow[]).reduce(
    (sum, r) => sum + r.quantity * (Number(r.vendor_tp) - Number(r.original_tp)),
    0,
  );
  const totalDeliveryCostInvoiced = (deliveryCostRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.delivery_cost ?? 0),
    0,
  );

  return {
    total_vendors: vendorCountRes.count ?? 0,
    total_receivable: totalReceivable,
    total_paid: totalPaid,
    total_due: calculateVendorCurrentDue({
      unsettledStockValue: totalStockValue,
      totalReceivable,
      totalDeliveryCostInvoiced,
      totalPaid,
    }),
    total_stock_value: totalStockValue,
    collected_this_week: collectedThisWeek,
    collected_this_month: collectedThisMonth,
    total_margin_dispatched: totalMarginDispatched,
    slow_moving_stock_value: slowMovingStockValue,
  };
}
