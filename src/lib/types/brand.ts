export interface Brand {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

/** What the storefront needs to show a brand — no store_id or admin fields. */
export interface StorefrontBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

/** Largest logo file accepted, in bytes (checked in the form and again on upload). */
export const MAX_BRAND_LOGO_BYTES = 4 * 1024 * 1024;

/** Plan feature key that turns brands on for a store (subscription_plans.features). */
export const BRANDS_FEATURE_KEY = "brands";

/** Optional plan limit on how many brands a store can create (subscription_plans.limits). */
export const BRANDS_LIMIT_KEY = "max_brands";
