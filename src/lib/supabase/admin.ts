import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only: SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix so it is
// never bundled into client JS. Only import this from server components,
// API routes, or server actions.
let _adminClient: SupabaseClient | null = null;

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_adminClient) {
      // No fallback to a NEXT_PUBLIC_-prefixed variable here, deliberately —
      // that prefix gets inlined into client JS bundles by Next.js, which
      // would ship this full-privilege key to every visitor's browser.
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local",
        );
      }
      _adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        key,
      );
    }
    return (_adminClient as unknown as Record<string | symbol, unknown>)[prop];
  },
});
