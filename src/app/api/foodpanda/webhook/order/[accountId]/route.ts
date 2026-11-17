import { NextRequest, NextResponse } from "next/server";
import { getFoodpandaAccount } from "@/lib/utils/getFoodpandaAccount";
import { verifyFoodpandaWebhook } from "@/lib/utils/verifyFoodpandaWebhook";
import { ingestFoodpandaOrder } from "@/lib/queries/foodpanda/ingestFoodpandaOrder";

// foodpanda posts order events here. One URL per connected account, so the
// account is identified by the path and its secret verifies the request.
//
// foodpanda retries any non-2XX up to 5 times, 10 seconds apart. That means:
//   - a verification failure must NOT be retried, so it answers 401 and we
//     accept that foodpanda will retry it anyway — it is forged or misconfigured
//     either way, and 5 rejected attempts cost nothing.
//   - a transient failure on OUR side (database down) SHOULD be retried, so it
//     answers 500 deliberately.
//   - a duplicate delivery must answer 2XX, since the order already landed.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;

  // Raw text BEFORE any parsing. HMAC mode signs the exact uncompressed bytes;
  // parsing and re-serialising changes whitespace, key order and escaping, and
  // would produce a different signature for a perfectly genuine request.
  const rawBody = await req.text();

  const accountResult = await getFoodpandaAccount(accountId);
  if (!accountResult.ok) {
    // Unknown account id — nothing to verify against. Not retryable.
    console.warn(`foodpanda order webhook for unknown account ${accountId}`);
    return NextResponse.json({ error: "Unknown account" }, { status: 404 });
  }
  const account = accountResult.account;

  const verification = verifyFoodpandaWebhook({
    authType: account.webhookAuthType,
    secret: account.orderWebhookSecret,
    rawBody,
    signatureHeader: req.headers.get("x-dh-signature"),
    authorizationHeader: req.headers.get("authorization"),
  });

  if (!verification.valid) {
    // Log the reason server-side only; never tell the caller which check failed.
    console.warn(
      `foodpanda order webhook rejected for account ${accountId}: ${verification.reason}`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    // Verified but unparseable: retrying will not help.
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  try {
    const result = await ingestFoodpandaOrder(account, payload);
    if (!result.ok) {
      // Our own failure — let foodpanda retry.
      console.error(`foodpanda order ingest failed for ${accountId}:`, result.error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
    return NextResponse.json({ received: true, order_id: result.orderId }, { status: 200 });
  } catch (err) {
    console.error(`foodpanda order webhook threw for ${accountId}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// A GET is handy when pasting the URL into the Partner Portal to confirm it
// resolves; it deliberately reveals nothing about the account.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "foodpanda order webhook" }, { status: 200 });
}
