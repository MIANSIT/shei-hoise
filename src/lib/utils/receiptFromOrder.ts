import type { StoreOrder } from "@/lib/types/order";
import type { StoreInvoiceData } from "@/lib/hook/useInvoiceData";
import { generateReceiptPdfSet, ReceiptPdfSet } from "./generateReceiptPdf";
import { getStorePublicUrl } from "./productQr";
import { PAYMENT_LABELS } from "./paymentLabels";
import { resolveOrderInvoiceDate } from "./orderInvoiceDate";
import { branchReceiptLines, type InvoiceBranch } from "./invoiceStore";

/**
 * Rebuilds the same 58mm thermal receipt Quick Sale printed at checkout,
 * entirely from what's persisted on the order — used to reprint a POS
 * sale's receipt at any later time (e.g. after a page reload wiped the
 * checkout page's in-memory preview, which had no other copy of it).
 *
 * "Paid"/"Due" are read off the order's *current* state (payment_status +
 * paidToDate from customer_payments) rather than baked-in checkout-time
 * numbers, so a reprint after a partial due balance was collected later
 * shows today's real due amount, not a stale one.
 */
export async function buildReceiptPdfSetForOrder(
  order: StoreOrder,
  storeData: StoreInvoiceData,
  paidToDate: number,
  currencyIcon: string,
  /** Stores with branches: the order's branch, printed under the store name. */
  branch?: InvoiceBranch | null,
  /** The customer's membership number when they are a member; printed under the order number. */
  memberNumber?: string | null,
): Promise<ReceiptPdfSet> {
  const due =
    order.payment_status === "paid"
      ? null
      : Math.max(0, order.total_amount - paidToDate);
  const paidNow = due != null ? paidToDate : null;
  const showCustomer = due != null && due > 0.01;

  const cashReceived = order.cash_received ?? null;
  const changeDue =
    cashReceived != null ? Math.max(0, cashReceived - order.total_amount) : null;

  // Who the order is for. A walk-in Quick Sale has no real name or phone ("Walk-in Customer" /
  // "N/A"): print only what was entered. Online orders also print where the order goes.
  const shipping = order.shipping_address;
  const rawName = shipping?.customer_name || order.customers?.first_name || "";
  const rawPhone = shipping?.phone || order.customers?.phone || "";
  const customerName = rawName && rawName !== "Walk-in Customer" ? rawName : null;
  const customerPhone = rawPhone && rawPhone !== "N/A" && rawPhone !== "No phone" ? rawPhone : null;
  const addressLine = shipping?.address_line_1 || shipping?.address || "";
  const customerAddress =
    order.channel === "pos" ? null : [addressLine, shipping?.city, shipping?.country].filter(Boolean).join(", ") || null;

  return generateReceiptPdfSet({
    customerBlock: { name: customerName, phone: customerPhone, address: customerAddress, memberNumber: memberNumber ?? null },
    storeName: storeData.store_name,
    branchLines: branchReceiptLines(branch),
    logoUrl: storeData.logo_url,
    dateLabel: new Date(
      resolveOrderInvoiceDate(order.order_date, order.created_at) ?? order.created_at,
    ).toLocaleString(),
    orderNumber: order.order_number,
    items: order.order_items.map((item) => ({
      name:
        item.product_name +
        (item.variant_details?.variant_name ? ` (${item.variant_details.variant_name})` : ""),
      qty: item.quantity,
      amount: item.total_price,
    })),
    subtotal: order.subtotal,
    // discount_amount is the order's whole discount; the membership's part is shown on its own line.
    discount: Math.max(0, (order.discount_amount ?? 0) - (order.membership_discount ?? 0)),
    memberDiscount: order.membership_discount ?? 0,
    additionalCharges: order.additional_charges ?? 0,
    deliveryCharge: order.shipping_fee ?? 0,
    tax: order.tax_amount ?? 0,
    total: order.total_amount,
    paymentLabel:
      (order.payment_method && PAYMENT_LABELS[order.payment_method]) ||
      order.payment_method ||
      "—",
    cashReceived,
    changeDue,
    paidNow,
    due,
    customerName: showCustomer
      ? order.customers?.first_name || order.shipping_address?.customer_name || null
      : null,
    customerPhone: showCustomer
      ? order.shipping_address?.phone || order.customers?.phone || null
      : null,
    currencyIcon,
    shopQrUrl: storeData.store_slug ? getStorePublicUrl(storeData.store_slug) : null,
  });
}
