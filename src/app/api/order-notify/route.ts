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
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("❌ Order notify email failed:", error);
    return Response.json({ error: "Email failed" }, { status: 500 });
  }
}
