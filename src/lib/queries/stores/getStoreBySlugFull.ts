import { supabase } from "@/lib/supabase";

export interface StoreFull {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  social: {
    facebook_link: string | null;
    instagram_link: string | null;
    twitter_link: string | null;
    youtube_link: string | null;
  } | null;
}

const cache = new Map<string, { data: StoreFull | null; ts: number }>();
const CACHE_TIME = 10 * 60 * 1000; // 10 min

export async function getStoreBySlugFull(store_slug: string): Promise<StoreFull | null> {
  const cached = cache.get(store_slug);
  if (cached && Date.now() - cached.ts < CACHE_TIME) return cached.data;

  // fetch store
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select(`
      id,
      store_name,
      store_slug,
      logo_url,
      description,
      contact_email,
      contact_phone,
      business_address,
      created_at
    `)
    .eq("store_slug", store_slug)
    .single();

  if (storeError || !store) {
    cache.set(store_slug, { data: null, ts: Date.now() });
    return null;
  }

  // fetch social
  const { data: social } = await supabase
    .from("store_social_media")
    .select(`
      facebook_link,
      instagram_link,
      twitter_link,
      youtube_link
    `)
    .eq("store_id", store.id)
    .single();

  const full: StoreFull = {
    ...store,
    social: social ?? null,
  };

  cache.set(store_slug, { data: full, ts: Date.now() });
  return full;
}
