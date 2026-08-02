import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  // Always server-only (next/headers). Prefer SUPABASE_INTERNAL_URL when set
  // — see the comment in client.ts for why the browser-reachable URL isn't
  // necessarily reachable from the server in a containerized deployment.
  return createServerClient(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match the browser client's explicit cookie name (see client.ts)
      // — otherwise the server derives its own name from SUPABASE_INTERNAL_URL
      // and never finds the session cookie the browser actually set.
      cookieOptions: { name: "sb-shei-hoise-auth-token" },
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },
        async setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(async ({ name, value, options }) =>
              (await cookieStore).set(name, value, options)
            );
          } catch {
            // Server component - can't set cookies
          }
        },
      },
    }
  );
}