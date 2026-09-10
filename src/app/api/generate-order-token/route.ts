import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateShortToken } from "@/lib/utils/generateShortToken";

const EXPIRY_HOURS = 24;

interface RequestedProduct {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

/**
 * Public and unauthenticated on purpose — "Generate Order Link" is a
 * storefront nav item any customer can use (see DesktopHeaderforStore.tsx),
 * not an admin-only tool, so this can't require a login. What it does need
 * is to never trust the client's word for *which store* a product belongs
 * to: store_id and every product/variant here are re-resolved and verified
 * server-side against store_slug, so a request crafted outside the normal
 * UI (a different store_id than the products actually belong to, or
 * product ids from an unrelated store) gets rejected instead of silently
 * producing a cross-store token.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { store_slug, products } = body as { store_slug?: string; products?: RequestedProduct[] };

  if (!store_slug || !products?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  const storeId = store.id;

  const productIds = [...new Set(products.map((p) => p.product_id))];
  const { data: ownedProducts, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }
  const ownedProductIds = new Set((ownedProducts ?? []).map((p) => p.id));
  if (productIds.some((id) => !ownedProductIds.has(id))) {
    return NextResponse.json({ error: "One or more products don't belong to this store" }, { status: 400 });
  }

  const variantIds = [...new Set(products.map((p) => p.variant_id).filter((id): id is string => !!id))];
  if (variantIds.length) {
    const { data: ownedVariants, error: variantsError } = await supabaseAdmin
      .from("product_variants")
      .select("id, product_id")
      .in("id", variantIds);

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 });
    }
    const ownedVariantByProduct = new Map((ownedVariants ?? []).map((v) => [v.id, v.product_id]));
    const variantMismatch = products.some(
      (p) => p.variant_id && ownedVariantByProduct.get(p.variant_id) !== p.product_id,
    );
    if (variantMismatch || variantIds.some((id) => !ownedVariantByProduct.has(id))) {
      return NextResponse.json({ error: "One or more variants are invalid for their product" }, { status: 400 });
    }
  }

  // Opportunistic cleanup — deletes whatever's already expired every time a
  // new link is generated, so the table never needs a cron job to stay small.
  await supabaseAdmin.from("order_link_tokens").delete().lt("expires_at", new Date().toISOString());

  const token = generateShortToken(7);
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin.from("order_link_tokens").insert({
    token,
    store_id: storeId,
    store_slug,
    products,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    token,
    url: `/${store_slug}/confirm-order?t=${token}`,
  });
}
