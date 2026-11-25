import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

function getSitemapClient() {
  // Always server-only. Prefer SUPABASE_INTERNAL_URL when set — see the
  // comment in src/lib/supabase/client.ts for why the browser-reachable URL
  // isn't necessarily reachable from the server in a containerized deployment.
  return createClient(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Rebuilt at most once an hour, so new stores and products reach Google without waiting for a deploy.
export const revalidate = 3600;

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

interface ProductStore {
  store_slug: string;
  is_active: boolean;
  status: string;
}

// products → stores is many-to-one, so PostgREST returns a single object, not
// an array. Accept both so the sitemap doesn't silently drop every product.
interface ProductRow {
  slug: string;
  updated_at: string | null;
  stores: ProductStore | ProductStore[] | null;
}

interface CategoryRow {
  slug: string;
  created_at: string | null;
  stores: ProductStore | ProductStore[] | null;
}

/** Every row of a query, page by page (one response is capped at 1,000). A failure leaves that section out. */
async function loadAll<T>(
  label: string,
  buildPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  try {
    return await fetchAllPaged<T>(
      (from, to) => buildPage(from, to) as PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
    );
  } catch (error) {
    console.error(`[sitemap] Failed to fetch ${label}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSitemapClient();

  // Fetch all active & approved/trial stores
  const stores = await loadAll<StoreRow>("stores", (from, to) =>
    supabase
      .from("stores")
      .select("store_slug, updated_at")
      .eq("is_active", true)
      .in("status", ["approved", "trial"])
      .order("id")
      .range(from, to),
  );

  const storeRoutes: MetadataRoute.Sitemap = stores.flatMap((store) => [
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
  const products = await loadAll<ProductRow>("products", (from, to) =>
    supabase
      .from("products")
      .select("slug, updated_at, stores!inner(store_slug, is_active, status)")
      .eq("status", "active")
      .order("id")
      .range(from, to),
  );

  const productRoutes: MetadataRoute.Sitemap = products.flatMap(
    (product) => {
      const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
      if (!store?.is_active || (store.status !== "approved" && store.status !== "trial")) {
        return [];
      }
      return [
        {
          url: `${baseUrl}/${store.store_slug}/product/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ];
    },
  );

  // Active categories, which each have their own /category/[slug] page.
  const categories = await loadAll<CategoryRow>("categories", (from, to) =>
    supabase
      .from("categories")
      .select("slug, created_at, stores!inner(store_slug, is_active, status)")
      .eq("is_active", true)
      // Categories kept for the shop's own use are not browsable pages worth indexing.
      .neq("show_in_store", false)
      .order("id")
      .range(from, to),
  );

  const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap(
    (category) => {
      const store = Array.isArray(category.stores) ? category.stores[0] : category.stores;
      if (!store?.is_active || (store.status !== "approved" && store.status !== "trial")) {
        return [];
      }
      return [
        {
          url: `${baseUrl}/${store.store_slug}/category/${encodeURIComponent(category.slug)}`,
          lastModified: category.created_at ? new Date(category.created_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.75,
        },
      ];
    },
  );

  return [...staticRoutes, ...storeRoutes, ...categoryRoutes, ...productRoutes];
}
