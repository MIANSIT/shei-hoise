import { StoreOrder } from "@/lib/types/order";
import { getValidCurrency } from "@/lib/utils/currency";
import { InvoicePdfData } from "@/lib/utils/invoicePdfHelpers";

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
): InvoicePdfData {
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
      price: item.unit_price,
    })),
    currency: getValidCurrency(order.currency),
    subtotal: order.subtotal,
    deliveryCharge: order.shipping_fee,
    taxAmount: order.tax_amount,
    discountAmount: order.discount_amount,
    additionalCharges:
      order.additional_charges && order.additional_charges > 0
        ? [{ label: "Additional Charges", amount: order.additional_charges }]
        : [],
    totalDue: order.total_amount,
    amountPaid: paidAmount,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method ?? undefined,
    orderStatus: order.status,
    notes: order.notes ?? "",
    orderCreatedAt: order.created_at,
  };
}
