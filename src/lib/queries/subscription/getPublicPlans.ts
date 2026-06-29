import { supabase } from "@/lib/supabase";

export interface PublicPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: unknown;
  trial_days: number;
  is_featured: boolean;
  sort_order: number;
}

function formatFeatureKey(key: string): string {
  return key
    .split("_")
    .map((word) =>
      word.length <= 3
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export function parseFeatures(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.filter((f): f is string => typeof f === "string");
  }
  if (features && typeof features === "object") {
    return Object.entries(features as Record<string, unknown>)
      .filter(([, v]) => v === true || typeof v === "string")
      .map(([k, v]) => (typeof v === "string" ? v : formatFeatureKey(k)));
  }
  return [];
}

export function orderPlansWithFeaturedInMiddle(plans: PublicPlan[]): PublicPlan[] {
  const featured = plans.filter((p) => p.is_featured);
  const nonFeatured = plans.filter((p) => !p.is_featured);

  if (featured.length === 0) return nonFeatured;

  const half = Math.floor(nonFeatured.length / 2);
  return [
    ...nonFeatured.slice(0, half),
    ...featured,
    ...nonFeatured.slice(half),
  ];
}

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, currency, features, trial_days, is_featured, sort_order",
    )
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PublicPlan[];
}
