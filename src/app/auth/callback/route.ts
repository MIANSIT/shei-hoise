// app/auth/callback/route.ts
// Server-side PKCE code exchange for Supabase Auth.
// Supabase redirects here with ?code=... after verifying the email link.
// This route exchanges the code for a session (server-side, no verifier issues),
// then redirects the browser to /auth/update-password.
//
// Add to Supabase → Authentication → URL Configuration → Redirect URLs:
//   http://localhost:3000/auth/callback
//   https://www.sheihoise.com/auth/callback

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now stored in cookies — redirect to the update-password page
      return NextResponse.redirect(`${origin}/auth/update-password`);
    }
  }

  // Exchange failed — redirect to update-password which will show the expired-link UI
  return NextResponse.redirect(`${origin}/auth/update-password?error=link_expired`);
}
