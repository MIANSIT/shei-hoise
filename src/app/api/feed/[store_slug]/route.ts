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

// Strip markdown so catalog descriptions show as plain readable text
function stripMarkdown(str: string): string {
  return str
    .replace(/#{1,6}\s*/g, "")      // ## headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/\*(.+?)\*/g, "$1")     // *italic*
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [links](url)
    .replace(/`(.+?)`/g, "$1")       // `code`
    .replace(/\n{3,}/g, "\n\n")      // collapse excess blank lines
    .trim();
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
  variant_name: string | null;
  color: string | null;
  base_price: number;
  discounted_price: number | null;
  product_inventory: DbInventory[] | null;
  product_images: DbImage[] | null;
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
    .select("id, store_name, store_slug, store_settings(currency)")
    .eq("store_slug", store_slug)
    .eq("is_active", true)
    .single();

  if (storeError || !store) {
    return new Response("Store not found", { status: 404 });
  }

  const currency =
    (store.store_settings as { currency?: string } | null)?.currency ?? "BDT";

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
        variant_name,
        color,
        base_price,
        discounted_price,
        product_inventory(quantity_available, quantity_reserved),
        product_images(image_url, is_primary)
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

  // Build one XML <item> string from the given fields
  function buildItem(fields: {
    id: string;
    itemGroupId?: string;
    title: string;
    description: string;
    productUrl: string;
    primaryImage: string;
    additionalImages: string[];
    availability: string;
    basePrice: number;
    salePrice: number | null;
    category: string | null;
    color?: string | null;
    variantName?: string | null;
  }): string {
    const lines: string[] = [
      `    <item>`,
      `      <g:id>${esc(fields.id)}</g:id>`,
    ];

    // item_group_id links variant items back to the same parent product
    if (fields.itemGroupId) {
      lines.push(`      <g:item_group_id>${esc(fields.itemGroupId)}</g:item_group_id>`);
    }

    lines.push(
      `      <g:title>${esc(fields.title)}</g:title>`,
      `      <g:description>${esc(fields.description)}</g:description>`,
      `      <g:link>${esc(fields.productUrl)}</g:link>`,
    );

    if (fields.primaryImage) {
      lines.push(`      <g:image_link>${esc(fields.primaryImage)}</g:image_link>`);
    }
    for (const img of fields.additionalImages) {
      lines.push(`      <g:additional_image_link>${esc(img)}</g:additional_image_link>`);
    }

    lines.push(
      `      <g:availability>${fields.availability}</g:availability>`,
      `      <g:condition>new</g:condition>`,
      `      <g:identifier_exists>no</g:identifier_exists>`,
      `      <g:price>${fields.basePrice.toFixed(2)} ${currency}</g:price>`,
    );

    if (fields.salePrice !== null && fields.salePrice < fields.basePrice) {
      lines.push(`      <g:sale_price>${fields.salePrice.toFixed(2)} ${currency}</g:sale_price>`);
    }

    if (fields.color) {
      lines.push(`      <g:color>${esc(fields.color)}</g:color>`);
    }

    // variant_name used as size when no separate color attribute exists
    if (fields.variantName && !fields.color) {
      lines.push(`      <g:size>${esc(fields.variantName)}</g:size>`);
    }

    if (fields.category) {
      lines.push(`      <g:product_type>${esc(fields.category)}</g:product_type>`);
    }

    lines.push(
      `      <g:brand>${esc(store!.store_name)}</g:brand>`,
      `    </item>`,
    );

    return lines.join("\n");
  }

  const items = products.flatMap((p) => {
    const category =
      Array.isArray(p.categories) && p.categories.length > 0
        ? p.categories[0].name
        : null;

    const rawDescription = stripMarkdown(p.short_description || p.description || p.name);
    // Facebook catalog max description length is 5000 chars
    const description = rawDescription.length > 5000 ? rawDescription.slice(0, 4997) + "..." : rawDescription;
    const productUrl = `${baseUrl}/${store_slug}/product/${p.slug}`;

    // Parent-level images (not tied to a specific variant)
    const parentImages = (p.product_images ?? []).filter((img) => img.variant_id === null);

    const activeVariants = (p.product_variants ?? []).filter((v) => v.is_active !== false);

    if (activeVariants.length > 0) {
      // --- Products with variants: one <item> per variant ---
      return activeVariants.map((v) => {
        // Use variant images first, fall back to parent images
        const vImages = (v.product_images ?? []);
        const images = vImages.length > 0 ? vImages : parentImages;
        const primaryImage = images.find((i) => i.is_primary)?.image_url ?? images[0]?.image_url ?? "";
        const additionalImages = images
          .filter((img) => img.image_url !== primaryImage)
          .map((img) => img.image_url)
          .slice(0, 9);

        const inv = v.product_inventory?.[0];
        const variantAvailable = inv ? inv.quantity_available - inv.quantity_reserved > 0 : false;
        const availability = variantAvailable ? "in stock" : "out of stock";

        const basePrice = Number(v.base_price);
        const salePrice = v.discounted_price != null ? Number(v.discounted_price) : null;

        // Append variant name to title so each variant is distinct in the catalog
        const variantLabel = v.variant_name ? ` - ${v.variant_name}` : "";
        const title = `${p.name}${variantLabel}`;

        return buildItem({
          id: v.id,
          itemGroupId: p.id,
          title,
          description,
          productUrl,
          primaryImage,
          additionalImages,
          availability,
          basePrice,
          salePrice,
          category,
          color: v.color,
          variantName: v.variant_name,
        });
      });
    }

    // --- Products without variants: single <item> ---
    const images = parentImages.length > 0 ? parentImages : (p.product_images ?? []);
    const primaryImage = images.find((i) => i.is_primary)?.image_url ?? images[0]?.image_url ?? "";
    const additionalImages = images
      .filter((img) => img.image_url !== primaryImage)
      .map((img) => img.image_url)
      .slice(0, 9);

    const availability = isInStock(p) ? "in stock" : "out of stock";
    const basePrice = Number(p.base_price);
    const salePrice = p.discounted_price != null ? Number(p.discounted_price) : null;

    return [buildItem({
      id: p.id,
      title: p.name,
      description,
      productUrl,
      primaryImage,
      additionalImages,
      availability,
      basePrice,
      salePrice,
      category,
    })];
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
