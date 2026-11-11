import { supabase } from "@/lib/supabase";

export interface VendorInvoiceBalanceItem {
  product_name: string;
  sku: string | null;
  quantity: number;
  vendor_tp: number;
  line_total: number;
}

export interface VendorInvoiceBalance {
  order_id: string;
  invoice_number: string;
  order_date: string;
  subtotal: number;
  delivery_cost: number;
  discount_amount: number;
  grand_total: number;
  paid_allocated: number;
  /** The part of paid_allocated that came from the vendor's return credit rather than a payment. */
  credit_applied: number;
  due_remaining: number;
  /** grand_total without the delivery charge (goods less discount). */
  goods_total: number;
  goods_paid: number;
  goods_due: number;
  /** delivery_cost is the billed delivery charge; these say how much of it is paid and left. */
  delivery_paid: number;
  delivery_due: number;
  items: VendorInvoiceBalanceItem[];
}

// Per-invoice "how much of this dispatch has been paid off." Vendor stock
// is one pooled number per product, not tracked per order, so which
// specific invoice's units a settlement sold or returned is genuinely
// unknowable — but payments can be pinned to a specific invoice at record
// time (vendor_payments.vendor_order_id) when the owner knows which one a
// payment was for. Pinned payments apply directly to their invoice first;
// every other payment (upfront, settlement-linked, or an unpinned quick
// payment) runs as an oldest-invoice-first waterfall on top of that. Either
// way this always sums consistently and never double-counts against
// total_paid. current_due (see calculateVendorDue.ts) remains the one
// authoritative "what's owed" figure everywhere else — this is a
// supplementary, best-effort view of which invoices are already cleared.
export async function getVendorInvoiceBalances(
  vendorId: string,
): Promise<VendorInvoiceBalance[]> {
  if (!vendorId) return [];

  const [ordersRes, paymentsWithTypeRes, returnsRes] = await Promise.all([
    supabase
      .from("vendor_orders")
      .select(
        `
        id, invoice_number, order_date, subtotal, delivery_cost, discount_amount, grand_total,
        items:vendor_order_items(product_name, sku, quantity, vendor_tp, line_total)
      `,
      )
      .eq("vendor_id", vendorId)
      .eq("status", "confirmed")
      .order("order_date", { ascending: true }),
    supabase
      .from("vendor_payments")
      .select("amount, vendor_order_id, applies_to")
      .eq("vendor_id", vendorId),
    // Goods the vendor brought back after a settlement (negative receivable) are a credit
    // on their account, so they pay down the oldest invoices just like a payment would.
    supabase
      .from("vendor_settlements")
      .select("total_receivable")
      .eq("vendor_id", vendorId)
      .lt("total_receivable", 0),
  ]);

  // Before migration 20261212 the applies_to column does not exist: read the payments without it.
  let paymentsRes: { data: { amount: number; vendor_order_id: string | null; applies_to?: string | null }[] | null } =
    paymentsWithTypeRes as unknown as typeof paymentsRes;
  if (paymentsWithTypeRes.error) {
    paymentsRes = (await supabase.from("vendor_payments").select("amount, vendor_order_id").eq("vendor_id", vendorId)) as unknown as typeof paymentsRes;
  }
  const orders = ordersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const returnCredit = (returnsRes.data ?? []).reduce((sum, r) => sum - Number(r.total_receivable), 0);

  const pinnedByOrder = new Map<string, number>();
  // The part of an invoice's pinned payments that said what they pay (the rest pays goods first, then delivery).
  const pinnedGoodsByOrder = new Map<string, number>();
  const pinnedDeliveryByOrder = new Map<string, number>();
  // A refund is a negative payment, so it takes back from the pool what it paid out.
  // The pool is kept as two parts so an invoice can show how much of it was credit:
  // payments are used first, the return credit covers the rest.
  let creditPool = returnCredit;
  let cashPool = 0;
  for (const payment of payments) {
    const amount = Number(payment.amount);
    if (payment.vendor_order_id) {
      pinnedByOrder.set(
        payment.vendor_order_id,
        (pinnedByOrder.get(payment.vendor_order_id) ?? 0) + amount,
      );
      if (payment.applies_to === "goods") {
        pinnedGoodsByOrder.set(payment.vendor_order_id, (pinnedGoodsByOrder.get(payment.vendor_order_id) ?? 0) + amount);
      } else if (payment.applies_to === "delivery") {
        pinnedDeliveryByOrder.set(payment.vendor_order_id, (pinnedDeliveryByOrder.get(payment.vendor_order_id) ?? 0) + amount);
      }
    } else {
      cashPool += amount;
    }
  }

  const balances: VendorInvoiceBalance[] = orders.map((order) => {
    const grandTotal = Number(order.grand_total);
    const pinned = pinnedByOrder.get(order.id) ?? 0;
    const remainingAfterPinned = grandTotal - pinned;

    let fromPool = 0;
    let creditApplied = 0;
    if (remainingAfterPinned > 0) {
      fromPool = Math.min(remainingAfterPinned, Math.max(cashPool + creditPool, 0));
      const fromCash = Math.min(fromPool, Math.max(cashPool, 0));
      creditApplied = fromPool - fromCash;
      cashPool -= fromCash;
      creditPool -= creditApplied;
    }

    const paidAllocated = pinned + fromPool;

    // Split what this invoice has paid into goods and delivery charge. A payment that named what it pays fills that
    // part first (and spills into the other once full); the rest fills goods first, then delivery. The two parts
    // always add up to what the invoice has paid (never more than its total).
    const deliveryBilled = Math.max(0, Number(order.delivery_cost));
    const goodsBilled = Math.max(0, grandTotal - deliveryBilled);
    let goodsPaid = 0;
    let deliveryPaid = 0;
    const fillGoods = (a: number): number => {
      const x = Math.max(0, Math.min(a, goodsBilled - goodsPaid));
      goodsPaid += x;
      return a - x;
    };
    const fillDelivery = (a: number): number => {
      const x = Math.max(0, Math.min(a, deliveryBilled - deliveryPaid));
      deliveryPaid += x;
      return a - x;
    };
    const typedGoods = Math.max(0, pinnedGoodsByOrder.get(order.id) ?? 0);
    const typedDelivery = Math.max(0, pinnedDeliveryByOrder.get(order.id) ?? 0);
    fillDelivery(fillGoods(typedGoods));
    fillGoods(fillDelivery(typedDelivery));
    fillDelivery(fillGoods(Math.max(0, pinned - typedGoods - typedDelivery) + fromPool));
    const paidInTotal = Math.min(Math.max(paidAllocated, 0), grandTotal);
    if (Math.abs(goodsPaid + deliveryPaid - paidInTotal) > 0.005) {
      deliveryPaid = Math.min(deliveryPaid, paidInTotal);
      goodsPaid = Math.min(goodsBilled, paidInTotal - deliveryPaid);
      deliveryPaid = Math.min(deliveryBilled, paidInTotal - goodsPaid);
    }

    return {
      order_id: order.id,
      invoice_number: order.invoice_number,
      order_date: order.order_date,
      subtotal: Number(order.subtotal),
      delivery_cost: Number(order.delivery_cost),
      discount_amount: Number(order.discount_amount),
      grand_total: grandTotal,
      paid_allocated: paidAllocated,
      credit_applied: creditApplied,
      due_remaining: grandTotal - paidAllocated,
      goods_total: goodsBilled,
      goods_paid: goodsPaid,
      goods_due: goodsBilled - goodsPaid,
      delivery_paid: deliveryPaid,
      delivery_due: deliveryBilled - deliveryPaid,
      items: (order.items ?? []).map((item) => ({
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        vendor_tp: Number(item.vendor_tp),
        line_total: Number(item.line_total),
      })),
    };
  });

  // Computed oldest-first (the waterfall applies in that order); display newest-first.
  return balances.reverse();
}
