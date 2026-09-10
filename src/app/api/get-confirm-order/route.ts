import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("order_link_tokens")
    .select("store_id, store_slug, products, created_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Order token expired or invalid" },
      { status: 404 },
    );
  }

  // expires_at is included so the confirm-order page can show the customer
  // a countdown, not just fail silently once time runs out.
  return NextResponse.json({ data });
}

/**
 * Invalidates the token once it's actually been used to place an order —
 * without this, the same shared link stays valid (and re-usable to place
 * another order) for its full expiry window even after someone already
 * completed it with it.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await supabaseAdmin.from("order_link_tokens").delete().eq("token", token);
  return NextResponse.json({ success: true });
}
