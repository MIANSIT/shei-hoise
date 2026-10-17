import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeature } from "@/lib/utils/planFeatures";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { normalizeBdPhone } from "@/lib/utils/normalizeBdPhone";
import type { CheckoutLeadItem } from "@/lib/types/checkoutLead";

interface CheckoutLeadBody {
  store_slug?: unknown;
  phone?: unknown;
  name?: unknown;
  city?: unknown;
  items?: unknown;
  value?: unknown;
  currency?: unknown;
  converted?: unknown;
}

const MAX_ITEMS = 30;
// Leads older than this are dropped on the next write for the store, so
// customer phone numbers aren't kept indefinitely.
const RETENTION_DAYS = 60;

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanItems(raw: unknown): CheckoutLeadItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CheckoutLeadItem[] = [];
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = cleanString(e.name, 200);
    const quantity = Number(e.quantity);
    const price = Number(e.price);
    if (!name || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) continue;
    items.push({ name, quantity: Math.min(Math.floor(quantity), 999), price });
  }
  return items;
}

/**
 * Records (or updates) a shopper who typed a phone number at checkout, or marks
 * them converted once they order. Public like /api/pixel-event, so everything is
 * validated and capped; it only stores for stores that can see the list.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutLeadBody;

    const storeSlug = cleanString(body.store_slug, 128);
    const phone = typeof body.phone === "string" ? normalizeBdPhone(body.phone) : null;
    if (!storeSlug || !phone) {
      return Response.json({ error: "Missing store_slug or a valid phone" }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("store_slug", storeSlug)
      .single();
    if (!store) return Response.json({ error: "Store not found" }, { status: 404 });

    // The list lives on the Pixel Analytics page — don't keep phone numbers
    // for stores that can't open it.
    const [{ data: settings }, subscription] = await Promise.all([
      supabaseAdmin.from("store_settings").select("facebook_pixel_id").eq("store_id", store.id).maybeSingle(),
      getStoreFeatureSubscription(store.id),
    ]);
    if (!settings?.facebook_pixel_id || !hasFeature(subscription, "meta_pixel")) {
      return Response.json({ ok: true, stored: false }, { status: 200 });
    }

    const now = new Date().toISOString();

    if (body.converted === true) {
      const { error } = await supabaseAdmin
        .from("checkout_leads")
        .update({ converted_at: now, updated_at: now })
        .eq("store_id", store.id)
        .eq("phone", phone);
      if (error) throw error;
      return Response.json({ ok: true }, { status: 200 });
    }

    const items = cleanItems(body.items);
    const value = Number(body.value);

    const { error } = await supabaseAdmin.from("checkout_leads").upsert(
      {
        store_id: store.id,
        phone,
        customer_name: cleanString(body.name, 255),
        city: cleanString(body.city, 255),
        items,
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
        cart_value: Number.isFinite(value) && value >= 0 ? value : 0,
        currency: cleanString(body.currency, 10),
        // A shopper who ordered before and is back in checkout is open again.
        converted_at: null,
        updated_at: now,
      },
      { onConflict: "store_id,phone" },
    );
    if (error) throw error;

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    await supabaseAdmin.from("checkout_leads").delete().eq("store_id", store.id).lt("updated_at", cutoff);

    return Response.json({ ok: true, stored: true }, { status: 201 });
  } catch (err) {
    console.error("checkout-lead:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
