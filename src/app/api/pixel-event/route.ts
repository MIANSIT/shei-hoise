import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { event, params, store_slug } = await req.json();

    if (!event || !store_slug) {
      return Response.json({ error: "Missing event or store_slug" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", store_slug)
      .single();

    if (storeError || !store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    await supabaseAdmin.from("pixel_events").insert({
      store_id: store.id,
      event_name: event,
      metadata: params ?? {},
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
