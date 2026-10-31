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

  // Online orders carry who it is for and where it goes; Quick Sale walk-ins have none
  // (a due sale already prints its customer next to the DUE line).
  const shipping = order.shipping_address;
  const addressLine = shipping?.address_line_1 || shipping?.address || "";
  const customerInfo =
    order.channel === "pos"
      ? null
      : {
          name: shipping?.customer_name || order.customers?.first_name || null,
          phone: shipping?.phone || order.customers?.phone || null,
          address: [addressLine, shipping?.city, shipping?.country].filter(Boolean).join(", ") || null,
        };

  return generateReceiptPdfSet({
    customerInfo,
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
    discount: order.discount_amount ?? 0,
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
