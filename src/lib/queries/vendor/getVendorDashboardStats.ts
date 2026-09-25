import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { calculateVendorCurrentDue } from "./calculateVendorDue";
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
    margin_realized: 0,
    slow_moving_count: 0,
  };

  if (!vendorId) return empty;

  // Every query is paged: a single request is capped at PGRST_DB_MAX_ROWS
  // (1000), and a long-running vendor past that would silently get totals,
  // due and profit computed from only part of its history.
  const loadRows = () =>
    Promise.all([
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_stock")
          .select(
            "product_id, variant_id, quantity_available, last_vendor_tp, updated_at",
          )
          .eq("vendor_id", vendorId)
          .order("id")
          .range(from, to),
      ),
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_orders")
          .select("total_quantity, delivery_cost")
          .eq("vendor_id", vendorId)
          .eq("status", "confirmed")
          .order("id")
          .range(from, to),
      ),
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_order_items")
          .select(
            "product_id, variant_id, quantity, original_tp, vendor_tp, order:vendor_orders!inner(vendor_id, status)",
          )
          .eq("order.vendor_id", vendorId)
          .eq("order.status", "confirmed")
          .order("id")
          .range(from, to),
      ),
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_settlement_items")
          .select(
            "product_id, variant_id, sold_quantity, returned_quantity, unit_price, receivable_amount, settlement:vendor_settlements!inner(vendor_id)",
          )
          .eq("settlement.vendor_id", vendorId)
          .order("id")
          .range(from, to),
      ),
      fetchAllPaged((from, to) =>
        supabase
          .from("vendor_payments")
          .select("amount, payment_date")
          .eq("vendor_id", vendorId)
          .order("payment_date", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ]);

  let rows: Awaited<ReturnType<typeof loadRows>>;
  try {
    rows = await loadRows();
  } catch (error) {
    console.error("Failed to load vendor stats:", error);
    return empty;
  }
  const [stockRows, orders, orderItems, settlementItems, payments] = rows;
  const currentStock = stockRows.reduce(
    (sum, r) => sum + r.quantity_available,
    0,
  );
  const unsettledStockValue = stockRows.reduce(
    (sum, r) => sum + r.quantity_available * Number(r.last_vendor_tp ?? 0),
    0,
  );
  const slowMovingCutoff = dayjs().subtract(SLOW_MOVING_DAYS, "day");
  const slowMovingCount = stockRows.filter(
    (r) =>
      r.quantity_available > 0 &&
      dayjs(r.updated_at).isBefore(slowMovingCutoff),
  ).length;

  const totalDispatched = orders.reduce((sum, r) => sum + r.total_quantity, 0);
  const totalDeliveryCostInvoiced = orders.reduce(
    (sum, r) => sum + Number(r.delivery_cost ?? 0),
    0,
  );
  const marginDispatched = orderItems.reduce(
    (sum, r) =>
      sum + r.quantity * (Number(r.vendor_tp) - Number(r.original_tp)),
    0,
  );

  const totalSold = settlementItems.reduce(
    (sum, r) => sum + r.sold_quantity,
    0,
  );
  const totalReturned = settlementItems.reduce(
    (sum, r) => sum + r.returned_quantity,
    0,
  );
  const totalReceivable = settlementItems.reduce(
    (sum, r) => sum + Number(r.receivable_amount),
    0,
  );

  const totalPaid = payments.reduce((sum, r) => sum + Number(r.amount), 0);

  // Profit is counted as the vendor pays: total paid × profit share, where
  // profit share = margin ÷ full bill (goods + delivery). Same formula as
  // getVendorStoreProfitForPeriod.
  const totalBill =
    orderItems.reduce((sum, r) => sum + r.quantity * Number(r.vendor_tp), 0) +
    totalDeliveryCostInvoiced;
  const marginRealized =
    totalBill > 0 ? totalPaid * (marginDispatched / totalBill) : 0;

  return {
    vendor_id: vendorId,
    current_stock_count: currentStock,
    total_dispatched: totalDispatched,
    total_sold: totalSold,
    total_returned: totalReturned,
    total_receivable: totalReceivable,
    total_paid: totalPaid,
    current_due: calculateVendorCurrentDue({
      unsettledStockValue,
      totalReceivable,
      totalDeliveryCostInvoiced,
      totalPaid,
    }),
    last_payment_date: payments[0]?.payment_date ?? null,
    margin_dispatched: marginDispatched,
    margin_realized: marginRealized,
    slow_moving_count: slowMovingCount,
  };
}
