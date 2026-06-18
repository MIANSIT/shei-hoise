import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

// Revalidate at the CDN level — actual data freshness controlled by Cache-Control header
export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface DbInventory {
  quantity_available: number;
  quantity_reserved: number;
}

interface DbImage {
  image_url: string;
  is_primary: boolean;
  variant_id: string | null;
}

interface DbVariant {
  id: string;
  is_active: boolean | null;
  base_price: number;
  discounted_price: number | null;
  product_inventory: DbInventory[] | null;
}

interface DbProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  discounted_price: number | null;
  status: string;
  categories: { name: string }[] | null;
  product_images: DbImage[] | null;
  product_inventory: DbInventory[] | null;
  product_variants: DbVariant[] | null;
}

function isInStock(product: DbProduct): boolean {
  const variants = (product.product_variants ?? []).filter((v) => v.is_active !== false);
  if (variants.length > 0) {
    return variants.some((v) => {
      const inv = v.product_inventory?.[0];
      return inv ? inv.quantity_available - inv.quantity_reserved > 0 : false;
    });
  }
  const inv = product.product_inventory?.[0];
  return inv ? inv.quantity_available - inv.quantity_reserved > 0 : false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ store_slug: string }> },
) {
  const { store_slug } = await params;

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, store_name, store_slug")
    .eq("store_slug", store_slug)
    .eq("is_active", true)
    .single();

  if (storeError || !store) {
    return new Response("Store not found", { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      short_description,
      base_price,
      discounted_price,
      status,
      categories(name),
      product_images(image_url, is_primary, variant_id),
      product_inventory(quantity_available, quantity_reserved),
      product_variants(
        id,
        is_active,
        base_price,
        discounted_price,
        product_inventory(quantity_available, quantity_reserved)
      )
    `,
    )
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response("Error fetching products", { status: 500 });
  }

  const products = (data ?? []) as DbProduct[];

  const items = products.map((p) => {
    // Only use images that belong to the parent product (no variant_id)
    const images = (p.product_images ?? []).filter((img) => img.variant_id === null);
    const primaryImage = images.find((i) => i.is_primary)?.image_url ?? images[0]?.image_url ?? "";
    const additionalImages = images.filter((i) => !i.is_primary).slice(0, 9);

    const availability = isInStock(p) ? "in stock" : "out of stock";

    const basePrice = Number(p.base_price);
    const salePrice = p.discounted_price != null ? Number(p.discounted_price) : null;

    const category =
      Array.isArray(p.categories) && p.categories.length > 0
        ? p.categories[0].name
        : null;

    const description = (p.short_description || p.description || p.name).trim();
    const productUrl = `${baseUrl}/${store_slug}/product/${p.slug}`;

    const lines: string[] = [
      `    <item>`,
      // g:id must exactly match content_ids in pixel events (product.id UUID)
      `      <g:id>${esc(p.id)}</g:id>`,
      `      <g:title>${esc(p.name)}</g:title>`,
      `      <g:description>${esc(description)}</g:description>`,
      `      <g:link>${esc(productUrl)}</g:link>`,
    ];

    if (primaryImage) {
      lines.push(`      <g:image_link>${esc(primaryImage)}</g:image_link>`);
    }
    for (const img of additionalImages) {
      lines.push(`      <g:additional_image_link>${esc(img.image_url)}</g:additional_image_link>`);
    }

    lines.push(
      `      <g:availability>${availability}</g:availability>`,
      `      <g:condition>new</g:condition>`,
      `      <g:price>${basePrice.toFixed(2)} BDT</g:price>`,
    );

    if (salePrice !== null && salePrice < basePrice) {
      lines.push(`      <g:sale_price>${salePrice.toFixed(2)} BDT</g:sale_price>`);
    }

    if (category) {
      lines.push(`      <g:product_type>${esc(category)}</g:product_type>`);
    }

    lines.push(
      `      <g:brand>${esc(store.store_name)}</g:brand>`,
      `    </item>`,
    );

    return lines.join("\n");
  });

  const feed = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">`,
    `  <channel>`,
    `    <title>${esc(store.store_name)}</title>`,
    `    <link>${esc(`${baseUrl}/${store_slug}`)}</link>`,
    `    <description>Products from ${esc(store.store_name)}</description>`,
    ...items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");

  return new Response(feed, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Meta fetches feeds and caches them — allow CDN to cache for 1 hour,
      // serve stale for up to 24 h while revalidating in background
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
