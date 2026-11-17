import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFoodpandaAccount } from "@/lib/utils/getFoodpandaAccount";
import { verifyFoodpandaWebhook } from "@/lib/utils/verifyFoodpandaWebhook";

// Catalog job results (add / update / export) arrive here. The body carries
// job_id, status and — for export and update — a download_url.
//
// This is the "Assortment Webhook" field in the Partner Portal.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const rawBody = await req.text();

  const accountResult = await getFoodpandaAccount(accountId);
  if (!accountResult.ok) {
    console.warn(`foodpanda catalog webhook for unknown account ${accountId}`);
    return NextResponse.json({ error: "Unknown account" }, { status: 404 });
  }
  const account = accountResult.account;

  const verification = verifyFoodpandaWebhook({
    authType: account.webhookAuthType,
    secret: account.catalogWebhookSecret,
    rawBody,
    signatureHeader: req.headers.get("x-dh-signature"),
    authorizationHeader: req.headers.get("authorization"),
  });

  if (!verification.valid) {
    console.warn(
      `foodpanda catalog webhook rejected for account ${accountId}: ${verification.reason}`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    job_id?: string;
    status?: string;
    job_status?: string;
    download_url?: string;
    platform_vendor_id?: string;
    vendor_id?: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (!payload.job_id) {
    // Nothing to reconcile against; accept so foodpanda stops retrying.
    console.warn(`foodpanda catalog webhook with no job_id for account ${accountId}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // status and job_status are both used across the three callback shapes.
  const status = (payload.status ?? payload.job_status ?? "COMPLETED").toUpperCase();

  const { error } = await supabaseAdmin
    .from("foodpanda_catalog_jobs")
    .update({
      status,
      download_url: payload.download_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", account.id)
    .eq("job_id", payload.job_id);

  if (error) {
    console.error(`foodpanda catalog job update failed for ${payload.job_id}:`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "foodpanda catalog webhook" }, { status: 200 });
}
