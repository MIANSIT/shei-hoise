import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/utils/encryption";

export const dynamic = "force-dynamic";

const VERIFICATION_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";
const SIGNATURE_HEADER = "X-PATHAO-Signature";

/**
 * One callback URL per connected Pathao account (store owners paste this into
 * their own Pathao merchant panel). Handles Pathao's one-time verification
 * handshake, then verifies every real event's signature against that specific
 * account's secret before accepting it — this is the only thing stopping one
 * store's webhook URL from accepting forged events for another store.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const { credentialId } = await params;

  const { data: credential } = await supabaseAdmin
    .from("store_courier_credentials")
    .select("webhook_secret")
    .eq("id", credentialId)
    .eq("courier", "pathao")
    .maybeSingle();

  if (!credential?.webhook_secret) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }

  const secret = decrypt(credential.webhook_secret);
  const body = await req.json().catch(() => null);

  // Pathao's one-time check when the webhook is first added — proves we
  // control this URL by echoing the configured secret back as a header.
  if (body?.event === "webhook_integration") {
    return new NextResponse(null, {
      status: 202,
      headers: { [VERIFICATION_HEADER]: secret },
    });
  }

  // Every real event carries this header — reject anything that doesn't
  // match the secret this specific store configured.
  const signature = req.headers.get(SIGNATURE_HEADER);
  if (signature !== secret) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Kept for every event, sample or real — cheap audit trail and lets us
  // inspect the shape of event types we haven't handled yet (e.g. a
  // Payment Invoice event, whose fields are still unknown).
  const { error: logError } = await supabaseAdmin.from("pathao_webhook_debug_log").insert({
    credential_id: credentialId,
    headers: Object.fromEntries(req.headers.entries()),
    body,
  });

  if (logError) {
    console.error("Error saving Pathao webhook debug log:", logError);
  }

  // Pathao sends a real-shaped payload as a one-off sample right after the
  // webhook is added (marked is_sample: true) so merchants can see it
  // arrive — its consignment_id is fake and doesn't correspond to any real
  // shipment, so it must never be applied to courier_tracking.
  const consignmentId = body?.consignment_id;

  if (!body?.is_sample && typeof consignmentId === "string") {
    // Delivery lifecycle events (order.created, order.updated, delivered,
    // etc.) carry order_status_slug — mirrors what the manual "Refresh
    // Status" button already writes via getOrderInfo.
    const orderStatusSlug = body?.order_status_slug;
    if (typeof orderStatusSlug === "string") {
      const { error: statusError } = await supabaseAdmin
        .from("courier_tracking")
        .update({ status: orderStatusSlug, updated_at: new Date().toISOString() })
        .eq("consignment_id", consignmentId)
        .eq("is_active", true);

      if (statusError) {
        console.error("Error applying Pathao webhook status update:", statusError);
      }
    }

    // "order.paid" carries COD settlement info instead — never available
    // from the create-order response, only from this event. Merged into
    // the existing shipment_details rather than overwriting it.
    const paymentStatus = body?.payment_status;
    if (typeof paymentStatus === "string") {
      const { data: existing } = await supabaseAdmin
        .from("courier_tracking")
        .select("id, shipment_details")
        .eq("consignment_id", consignmentId)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        const mergedDetails = {
          ...((existing.shipment_details as Record<string, unknown> | null) ?? {}),
          paymentStatus,
          invoiceId: typeof body?.invoice_id === "string" ? body.invoice_id : null,
        };

        const { error: paymentError } = await supabaseAdmin
          .from("courier_tracking")
          .update({ shipment_details: mergedDetails, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (paymentError) {
          console.error("Error applying Pathao webhook payment status update:", paymentError);
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
