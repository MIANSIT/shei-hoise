import type { Metadata } from "next";
import React from "react";
import { createNormalClient } from "@/lib/supabase/client";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store_slug: string; slug: string }>;
}): Promise<Metadata> {
  const { store_slug, slug } = await params;
  const supabase = createNormalClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, store_name")
    .eq("store_slug", store_slug)
    .single();

  if (!store) return { title: "Product Not Found" };

  const { data: product } = await supabase
    .from("products")
    .select(
      "name, meta_title, meta_description, short_description, base_price, discounted_price, product_images(image_url, is_primary)"
    )
    .eq("slug", slug)
    .eq("store_id", store.id)
    .single();

  if (!product) return { title: `Product | ${store.store_name}` };

  const title = product.meta_title || product.name;
  const description =
    product.meta_description ||
    product.short_description ||
    `Buy ${product.name} at ${store.store_name}`;

  const images = (
    product.product_images as { image_url: string; is_primary: boolean }[] | null
  ) ?? [];
  const primaryImage =
    images.find((img) => img.is_primary)?.image_url ?? images[0]?.image_url;

  const productUrl = `${baseUrl}/${store_slug}/product/${slug}`;

  return {
    title: `${title} | ${store.store_name}`,
    description,
    alternates: {
      canonical: productUrl,
    },
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

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
