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
  limits: unknown;
  trial_days: number;
  is_featured: boolean;
  is_public: boolean;
  sort_order: number;
}

export const PLAN_COLUMNS =
  "id, name, slug, description, price_monthly, price_yearly, currency, features, limits, trial_days, is_featured, is_public, sort_order";

const ACRONYM_WORDS = new Set(["pos", "seo", "api", "pdf", "csv", "id", "url", "sms"]);
const LOWERCASE_WORDS = new Set(["per", "and", "or", "to", "of", "in", "on", "at", "a", "an", "the"]);

function formatFeatureKey(key: string): string {
  return key
    .split("_")
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYM_WORDS.has(lower)) return lower.toUpperCase();
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
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

export function parseLimits(limits: unknown): string[] {
  if (!limits || typeof limits !== "object") return [];
  return Object.entries(limits as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => {
      const label = formatFeatureKey(k.replace(/^max_/, ""));
      return v === -1 ? `Unlimited ${label}` : `Up to ${v} ${label}`;
    });
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

export async function getPlanById(planId: string): Promise<PublicPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(PLAN_COLUMNS)
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicPlan;
}

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(PLAN_COLUMNS)
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PublicPlan[];
}
