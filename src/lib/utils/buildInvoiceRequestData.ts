import { StoreOrder } from "@/lib/types/order";
import { getValidCurrency } from "@/lib/utils/currency";
import { InvoicePdfData } from "@/lib/utils/invoicePdfHelpers";
import { resolveOrderInvoiceDate } from "@/lib/utils/orderInvoiceDate";
import { invoiceTotals, invoiceUnitPrice } from "@/lib/utils/invoicePrice";

/**
 * Maps a StoreOrder into the flat shape the invoice PDF endpoints expect.
 * Mirrors the field mapping used by the single-invoice <InvoiceModal> wiring
 * in OrdersTable.tsx — kept here as one source of truth for the bulk-invoice
 * flow, which POSTs plain JSON rather than rendering props into a component.
 */
export function buildInvoiceRequestData(
  order: StoreOrder,
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  paidAmount?: number,
  /** The customer's membership number when they are a member. */
  memberNumber?: string | null,
): InvoicePdfData {
  // A Quick Sale line sold at a changed price prints that price; its extra
  // moves out of the extra-charge line so the total is unchanged.
  const printed = invoiceTotals(order.order_items, order.subtotal, order.additional_charges ?? 0);
  return {
    orderId: order.order_number,
    customer: {
      name: customerName,
      contact: customerPhone,
      address: customerAddress,
    },
    products: order.order_items.map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: invoiceUnitPrice(item),
    })),
    currency: getValidCurrency(order.currency),
    subtotal: printed.subtotal,
    deliveryCharge: order.shipping_fee,
    taxAmount: order.tax_amount,
    // discount_amount is the whole discount; the membership's part gets its own line.
    discountAmount: Math.max(0, (order.discount_amount ?? 0) - (order.membership_discount ?? 0)),
    memberDiscount: order.membership_discount ?? 0,
    memberNumber: memberNumber ?? null,
    additionalCharges:
      printed.additionalCharges > 0
        ? [{ label: "Additional Charges", amount: printed.additionalCharges }]
        : [],
    totalDue: order.total_amount,
    amountPaid: paidAmount,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method ?? undefined,
    orderStatus: order.status,
    notes: order.notes ?? "",
    // The invoice prints the order's own date (back-datable by the admin),
    // falling back to the row's insert time only when it's missing.
    orderCreatedAt: resolveOrderInvoiceDate(order.order_date, order.created_at),
  };
}
