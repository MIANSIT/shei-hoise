import { supabaseAdmin } from "@/lib/supabase/admin";
import type { FoodpandaAccount } from "@/lib/utils/getFoodpandaAccount";

export type IngestResult =
  | { ok: true; orderId: string; duplicate: boolean }
  | { ok: false; error: string };

interface FpItem {
  _id?: string;
  sku?: string;
  name?: string;
  pricing?: { quantity?: number; unit_price?: number | string; total_price?: number | string };
}

interface FpOrder {
  order_id?: string;
  order_code?: string;
  status?: string;
  order_type?: string;
  transport_type?: string;
  comment?: string;
  items?: FpItem[];
  payment?: {
    order_total?: number | string;
    sub_total?: number | string;
    delivery_fee?: number | string;
    discount?: number | string;
    total_taxes?: number | string;
    type?: string;
  };
  customer?: {
    first_name?: string;
    last_name?: string;
    mobile_phone?: string;
    email?: string;
    delivery_address?: Record<string, unknown>;
  };
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Turns one foodpanda order webhook payload into a Shei Hoise order.
 *
 * Idempotent by design: foodpanda retries a non-2XX up to five times and
 * documents no de-duplication of its own, so the same order_id can arrive
 * repeatedly. The unique partial index on orders.foodpanda_order_id is the
 * real guarantee — this function checks first for a clean path, and still
 * treats a 23505 from the insert as success rather than an error.
 */
export async function ingestFoodpandaOrder(
  account: FoodpandaAccount,
  payload: Record<string, unknown>,
): Promise<IngestResult> {
  const order = payload as FpOrder;
  const fpOrderId = order.order_id;
  if (!fpOrderId) return { ok: false, error: "payload has no order_id" };

  // Already ingested? Update its status and stop — never create a second order.
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("foodpanda_order_id", fpOrderId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("orders")
      .update({
        foodpanda_order_status: order.status ?? null,
        foodpanda_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { ok: true, orderId: existing.id, duplicate: true };
  }

  const items = order.items ?? [];
  const subtotal = num(order.payment?.sub_total, items.reduce(
    (s, it) => s + num(it.pricing?.total_price), 0,
  ));
  const shippingFee = num(order.payment?.delivery_fee);
  const discount = num(order.payment?.discount);
  const tax = num(order.payment?.total_taxes);
  const total = num(order.payment?.order_total, subtotal + shippingFee + tax - discount);

  const customerName = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  // foodpanda masks customer contact details; whatever it sends is stored as
  // the shipping address so staff can still identify the order.
  const shippingAddress = {
    customer_name: customerName || "foodpanda customer",
    phone: order.customer?.mobile_phone ?? "",
    email: order.customer?.email ?? "",
    address: order.customer?.delivery_address ?? {},
    source: "foodpanda",
  };

  const orderNumber = `FP-${(order.order_code || fpOrderId).toString().slice(0, 20).toUpperCase()}`;

  const { data: created, error: insertError } = await supabaseAdmin
    .from("orders")
    .insert({
      order_number: orderNumber,
      store_id: account.storeId,
      status: "pending",
      payment_status: order.payment?.type === "PAID" ? "paid" : "pending",
      payment_method: order.payment?.type ?? "foodpanda",
      subtotal,
      shipping_fee: shippingFee,
      discount_amount: discount,
      tax_amount: tax,
      total_amount: total,
      shipping_address: shippingAddress,
      notes: order.comment ?? null,
      channel: "foodpanda",
      foodpanda_order_id: fpOrderId,
      foodpanda_order_code: order.order_code ?? null,
      foodpanda_account_id: account.id,
      foodpanda_order_status: order.status ?? null,
      foodpanda_payload: payload,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    // 23505 = the unique index caught a concurrent duplicate delivery. That is
    // the index doing its job, not a failure — report success so foodpanda
    // stops retrying.
    if (insertError?.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("foodpanda_order_id", fpOrderId)
        .maybeSingle();
      if (raced) return { ok: true, orderId: raced.id, duplicate: true };
    }
    console.error("foodpanda order insert failed:", insertError);
    return { ok: false, error: insertError?.message ?? "could not create order" };
  }

  // Resolve each foodpanda SKU back to a Shei Hoise product where one is
  // mapped. An unmapped line still becomes an order line — losing it would
  // understate the order total and mislead the merchant.
  const skus = items.map((i) => i.sku).filter((s): s is string => !!s);
  const bySku = new Map<string, string>();
  if (skus.length) {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, foodpanda_sku")
      .eq("store_id", account.storeId)
      .in("foodpanda_sku", skus);
    for (const p of products ?? []) {
      if (p.foodpanda_sku) bySku.set(p.foodpanda_sku, p.id);
    }
  }

  if (items.length) {
    const rows = items.map((it) => {
      const quantity = Math.max(1, Math.round(num(it.pricing?.quantity, 1)));
      const unitPrice = num(it.pricing?.unit_price);
      return {
        order_id: created.id,
        product_id: it.sku ? (bySku.get(it.sku) ?? null) : null,
        product_name: it.name ?? it.sku ?? "foodpanda item",
        quantity,
        unit_price: unitPrice,
        total_price: num(it.pricing?.total_price, unitPrice * quantity),
      };
    });

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(rows);
    if (itemsError) {
      // The order exists and is visible; a missing line is bad but losing the
      // whole order to a retry loop is worse. Log loudly and accept.
      console.error(`foodpanda order ${created.id} saved without its items:`, itemsError);
    }
  }

  return { ok: true, orderId: created.id, duplicate: false };
}
