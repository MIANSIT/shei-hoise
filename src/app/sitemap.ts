import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

function getSitemapClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${baseUrl}/about`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${baseUrl}/stores`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${baseUrl}/contact-us`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${baseUrl}/help-center`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    url: `${baseUrl}/privacy-policy`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${baseUrl}/terms-and-conditions`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

interface StoreRow {
  store_slug: string;
  updated_at: string | null;
}

interface ProductRow {
  slug: string;
  updated_at: string | null;
  stores: {
    store_slug: string;
    is_active: boolean;
    status: string;
  }[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSitemapClient();

  // Fetch all active & approved/trial stores
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("store_slug, updated_at")
    .eq("is_active", true)
    .in("status", ["approved", "trial"])
    .order("created_at", { ascending: false });

  if (storesError) {
    console.error("[sitemap] Failed to fetch stores:", storesError.message);
  }

  const storeRoutes: MetadataRoute.Sitemap = ((stores ?? []) as StoreRow[]).flatMap((store) => [
    {
      url: `${baseUrl}/${store.store_slug}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/${store.store_slug}/shop`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${store.store_slug}/about-us`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ]);

  // Fetch all active products joined with their store slugs
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("slug, updated_at, stores!inner(store_slug, is_active, status)")
    .eq("status", "active");

  if (productsError) {
    console.error("[sitemap] Failed to fetch products:", productsError.message);
  }

  const productRoutes: MetadataRoute.Sitemap = ((products ?? []) as ProductRow[])
    .filter((product) => {
      const store = product.stores[0];
      return (
        store?.is_active &&
        (store.status === "approved" || store.status === "trial")
      );
    })
    .map((product) => {
      const store = product.stores[0];
      return {
        url: `${baseUrl}/${store.store_slug}/product/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  return [...staticRoutes, ...storeRoutes, ...productRoutes];
}
