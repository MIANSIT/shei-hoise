"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CreateVendorOrderInput, VendorOrder } from "@/lib/types/vendor/type";

const MAX_INVOICE_NUMBER_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";

function generateInvoiceNumber(): string {
  // Random suffix on top of the timestamp — Date.now() alone is only
  // unique to the millisecond, so a double-click or slow-network retry
  // could otherwise generate the same invoice number twice.
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `VO-${Date.now().toString(36).toUpperCase()}${random}`;
}

// Creates a vendor order in "draft" status with its line items. No stock
// moves yet — that only happens when the order is confirmed
// (confirmVendorOrder), per the business rule that dispatch is a deliberate
// separate step from drafting/reviewing the order.
export async function createVendorOrder(
  input: CreateVendorOrderInput,
): Promise<VendorOrder | null> {
  if (!input.items?.length) {
    throw new Error("At least one product is required");
  }

  const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = input.items.reduce(
    (sum, i) => sum + i.quantity * i.vendor_tp,
    0,
  );
  const deliveryCost = input.delivery_cost ?? 0;
  const discountAmount = input.discount_amount ?? 0;
  const grandTotal = subtotal + deliveryCost - discountAmount;
  const paidAmount = input.paid_amount ?? 0;
  const dueAmount = grandTotal - paidAmount;

  let orderId: string | null = null;

  try {
    let order: VendorOrder | null = null;
    for (let attempt = 1; attempt <= MAX_INVOICE_NUMBER_ATTEMPTS; attempt++) {
      const { data, error: orderError } = await supabaseAdmin
        .from("vendor_orders")
        .insert({
          store_id: input.store_id,
          vendor_id: input.vendor_id,
          invoice_number: generateInvoiceNumber(),
          status: "draft",
          order_date: input.order_date,
          invoice_date: input.invoice_date || null,
          delivery_date: input.delivery_date || null,
          delivery_person: input.delivery_person || null,
          vehicle_number: input.vehicle_number || null,
          reference_number: input.reference_number || null,
          notes: input.notes || null,
          total_quantity: totalQuantity,
          subtotal,
          delivery_cost: deliveryCost,
          discount_amount: discountAmount,
          grand_total: grandTotal,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          created_by: input.created_by || null,
        })
        .select("*")
        .single();

      if (!orderError) {
        order = data as VendorOrder;
        break;
      }

      const isInvoiceCollision =
        orderError.code === UNIQUE_VIOLATION && orderError.message.includes("invoice_number");
      if (!isInvoiceCollision || attempt === MAX_INVOICE_NUMBER_ATTEMPTS) {
        throw new Error(orderError.message);
      }
      // Collided with another order created in the same millisecond —
      // regenerate and retry rather than surfacing a raw DB error.
    }

    if (!order) throw new Error("Failed to create vendor order");
    orderId = order.id;

    const itemRows = input.items.map((item) => ({
      vendor_order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      original_tp: item.original_tp,
      increase_percent: item.increase_percent,
      vendor_tp: item.vendor_tp,
      mrp: item.mrp,
      line_total: item.quantity * item.vendor_tp,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("vendor_order_items")
      .insert(itemRows);

    if (itemsError) throw new Error(itemsError.message);

    return order as VendorOrder;
  } catch (err) {
    console.error("Error creating vendor order:", err);
    if (orderId) {
      await supabaseAdmin.from("vendor_orders").delete().eq("id", orderId);
    }
    throw err;
  }
}
