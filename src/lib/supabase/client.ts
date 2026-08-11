import { createBrowserClient } from "@supabase/ssr";

// This factory is also called from server components (e.g. via
// getStoreBySlugFull), not just real browser code. NEXT_PUBLIC_SUPABASE_URL
// is the browser-reachable URL (e.g. the self-hosted stack's published Kong
// port); on the server it may not be reachable at all (different Docker
// network namespace), so prefer SUPABASE_INTERNAL_URL there when set.
const SUPABASE_URL =
  typeof window === "undefined"
    ? process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// @supabase/ssr auto-derives its session cookie name from the Supabase URL
// unless told otherwise. Server-side code prefers SUPABASE_INTERNAL_URL
// (http://kong:8000) for reachability, while the browser always uses
// NEXT_PUBLIC_SUPABASE_URL (https://api.sheihoise.com) — two different URLs
// would auto-derive two different cookie names, so the server would never
// find the session cookie the browser actually set. Pinning an explicit,
// shared name here keeps client/server/middleware all reading and writing
// the exact same cookie regardless of which URL each one talks to.
const AUTH_COOKIE_NAME = "sb-shei-hoise-auth-token";

export function createNormalClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
  });
}
