import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/email/orderEmail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      storeId,
      orderNumber,
      customerInfo,
      orderProducts,
      subtotal,
      discount,
      additionalCharges,
      deliveryCost,
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      currency = "BDT",
      notes,
      deliveryOption,
    } = body;

    if (!storeId || !orderNumber) {
      return Response.json({ error: "Missing storeId or orderNumber" }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("store_name, contact_email")
      .eq("id", storeId)
      .single();

    if (!store?.contact_email) {
      return Response.json({ skipped: true, reason: "No contact email for store" });
    }

    const branch = await getOrderBranch(storeId, orderNumber);

    await sendOrderEmail({
      toEmail: store.contact_email,
      storeName: store.store_name,
      orderNumber,
      customerInfo,
      orderProducts,
      subtotal,
      discount,
      additionalCharges,
      deliveryCost,
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      currency,
      notes,
      deliveryOption,
      branchName: branch?.name,
      branchNote: branch?.note,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Order notify email failed:", error);
    return Response.json({ error: "Email failed" }, { status: 500 });
  }
}

/**
 * The order's branch as saved (stores with branches only). Read from the
 * database rather than the request so the email matches what was stored.
 */
async function getOrderBranch(
  storeId: string,
  orderNumber: string,
): Promise<{ name: string; note?: string } | null> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("branch_id, needs_transfer, branch_confirmed")
    .eq("store_id", storeId)
    .eq("order_number", orderNumber)
    .maybeSingle();
  // No branch columns yet (migration not applied) or no branch: no branch line.
  if (error || !order?.branch_id) return null;

  const { data: branch } = await supabaseAdmin
    .from("store_branches")
    .select("name")
    .eq("id", order.branch_id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!branch?.name) return null;

  const note = order.needs_transfer
    ? "Needs a stock transfer"
    : order.branch_confirmed === false
      ? "Waiting for branch confirmation"
      : undefined;
  return { name: branch.name, note };
}
