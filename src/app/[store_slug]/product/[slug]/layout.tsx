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
      "id, name, meta_title, meta_description, short_description, base_price, discounted_price, product_images(image_url, is_primary), product_inventory(quantity_available, quantity_reserved), categories(id, name, slug)",
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

  const { store, product, currency } = result;

  const effectivePrice = (product.discounted_price ?? product.base_price) as number;
  const inventory =
    (product.product_inventory as { quantity_available: number; quantity_reserved: number }[] | null) ?? [];
  const totalAvailable = inventory.reduce(
    (sum, row) => sum + row.quantity_available - row.quantity_reserved,
    0,
  );
  const availability = totalAvailable > 0 ? "instock" : "oos";

  const images =
    (product.product_images as { image_url: string; is_primary: boolean }[] | null) ?? [];
  const sortedImages = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const productUrl = `${baseUrl}/${store_slug}/product/${slug}`;
  const storeUrl = `${baseUrl}/${store_slug}`;

  type CategoryRow = { id: string; name: string; slug: string };
  const rawCategory = product.categories as CategoryRow | CategoryRow[] | null;
  const category = Array.isArray(rawCategory) ? (rawCategory[0] ?? null) : rawCategory;

  // Breadcrumb structured data — shows the Home > Store > Category > Product
  // trail directly in the search result instead of a bare URL, and tells
  // Google how this product nests under the store and its category.
  const breadcrumbItems = [
    { name: "Home", item: baseUrl },
    { name: store.store_name, item: storeUrl },
    ...(category ? [{ name: category.name, item: `${storeUrl}/shop?category=${category.slug}` }] : []),
    { name: product.name, item: productUrl },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };

  // Product structured data — lets Google show price/availability directly in
  // search results and match category-level searches (e.g. "cat food") to
  // this exact product instead of guessing from visible text alone.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.meta_description || product.short_description || `Buy ${product.name} at ${store.store_name}`,
    image: sortedImages.map((img) => img.image_url),
    sku: product.id,
    brand: { "@type": "Brand", name: store.store_name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: currency,
      price: effectivePrice,
      availability: `https://schema.org/${availability === "instock" ? "InStock" : "OutOfStock"}`,
      seller: { "@type": "Organization", name: store.store_name },
    },
  };

  return (
    <>
      {/* React 19 hoists individual <meta> tags to <head> automatically. */}
      <meta property="product:price:amount" content={String(effectivePrice)} />
      <meta property="product:price:currency" content={currency} />
      <meta property="product:availability" content={availability} />
      <meta property="product:retailer_item_id" content={product.id as string} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
