import type { Metadata } from "next";
import { cache } from "react";
import { createNormalClient } from "@/lib/supabase/client";

export const revalidate = 300; // cache for 5 minutes on Vercel CDN

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// React.cache() deduplicates this fetch — called once in generateMetadata,
// once in ProductLayout, but only hits the DB once per request.
const fetchProductData = cache(async (store_slug: string, slug: string) => {
  const supabase = createNormalClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, store_name, store_settings(currency)")
    .eq("store_slug", store_slug)
    .single();

  if (!store) return null;

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, meta_title, meta_description, short_description, base_price, discounted_price, product_images(image_url, is_primary), product_inventory(quantity_available, quantity_reserved)",
    )
    .eq("slug", slug)
    .eq("store_id", store.id)
    .single();

  const settings = store.store_settings as { currency?: string }[] | null;
  const storeCurrency = (Array.isArray(settings) ? settings[0]?.currency : null) ?? "BDT";

  return product ? { store, product, currency: storeCurrency } : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store_slug: string; slug: string }>;
}): Promise<Metadata> {
  const { store_slug, slug } = await params;
  const result = await fetchProductData(store_slug, slug);

  if (!result) return { title: "Product Not Found" };
  const { store, product } = result;

  const title = (product.meta_title || product.name) as string;
  const description = (
    product.meta_description ||
    product.short_description ||
    `Buy ${product.name} at ${store.store_name}`
  ) as string;

  const images =
    (product.product_images as { image_url: string; is_primary: boolean }[] | null) ?? [];
  const primaryImage =
    images.find((img) => img.is_primary)?.image_url ?? images[0]?.image_url;

  const productUrl = `${baseUrl}/${store_slug}/product/${slug}`;

  return {
    title: `${title} | ${store.store_name}`,
    description,
    alternates: { canonical: productUrl },
    openGraph: {
      title: `${title} | ${store.store_name}`,
      description,
      url: productUrl,
      siteName: store.store_name,
      images: primaryImage ? [{ url: primaryImage, alt: title }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${store.store_name}`,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ store_slug: string; slug: string }>;
}

export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const { store_slug, slug } = await params;
  const result = await fetchProductData(store_slug, slug);

  if (!result) return <>{children}</>;

  const { product, currency } = result;

  const effectivePrice = (product.discounted_price ?? product.base_price) as number;
  const inventory =
    (product.product_inventory as { quantity_available: number; quantity_reserved: number }[] | null) ?? [];
  const totalAvailable = inventory.reduce(
    (sum, row) => sum + row.quantity_available - row.quantity_reserved,
    0,
  );
  const availability = totalAvailable > 0 ? "instock" : "oos";

  return (
    <>
      {/* React 19 hoists individual <meta> tags to <head> automatically. */}
      <meta property="product:price:amount" content={String(effectivePrice)} />
      <meta property="product:price:currency" content={currency} />
      <meta property="product:availability" content={availability} />
      <meta property="product:retailer_item_id" content={product.id as string} />
      {children}
    </>
  );
}
