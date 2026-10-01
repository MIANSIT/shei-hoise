import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatureSubscription } from "@/lib/utils/getStoreFeatureSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { logActivity, STAFF_ACCOUNTS_FEATURE } from "@/lib/permissions/server";
import {
  staffEmailFor,
  STAFF_LOCK_MINUTES,
  STAFF_MAX_FAILED_LOGINS,
} from "@/lib/permissions/staffIdentity";

/**
 * Staff username + password login.
 *
 * Signs in server-side so failed attempts can be counted and logged, then
 * hands the session to the browser as the same auth cookie the regular
 * email login sets. Error responses carry a `code` the login form translates;
 * an unknown username and a wrong password both return "invalid".
 */

const bodySchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(100),
  password: z.string().min(1).max(200),
});

// Per-IP throttle on top of the per-username lock, so one device can't spray
// guesses across many usernames. In-memory: production runs one Next.js
// container, and a restart only resets the window.
const IP_WINDOW_MS = 5 * 60 * 1000;
const IP_MAX_ATTEMPTS = 30;
const ipAttempts = new Map<string, { count: number; windowStart: number }>();

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= IP_MAX_ATTEMPTS;
}

interface StaffLoginRow {
  id: string;
  store_id: string;
  user_id: string;
  display_name: string;
  is_active: boolean;
  must_change_password: boolean;
  failed_login_count: number;
  locked_until: string | null;
  store_roles: { name: string } | null;
}

function fail(code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, code, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!ipAllowed(ip)) return fail("too_many", 429);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("invalid", 401);
    const { username, password } = parsed.data;

    const { data } = await supabaseAdmin
      .from("store_staff")
      .select(
        "id, store_id, user_id, display_name, is_active, must_change_password, failed_login_count, locked_until, store_roles (name)",
      )
      .eq("username", username)
      .maybeSingle();
    const staff = data as unknown as StaffLoginRow | null;

    if (!staff) {
      // Same answer and roughly the same time as a wrong password.
      await new Promise((r) => setTimeout(r, 400));
      return fail("invalid", 401);
    }

    const actorName = staff.display_name;
    const actorRole = staff.store_roles?.name ?? null;
    const lockedUntil = staff.locked_until ? new Date(staff.locked_until).getTime() : 0;
    if (lockedUntil > Date.now()) {
      return fail("locked", 429, { minutes: Math.ceil((lockedUntil - Date.now()) / 60_000) });
    }
    if (!staff.is_active) return fail("deactivated", 403);

    const subscription = await getStoreFeatureSubscription(staff.store_id);
    if (!hasFeature(subscription, STAFF_ACCOUNTS_FEATURE)) return fail("not_available", 403);

    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
    const supabase = createServerClient(
      process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Same pinned cookie name as the browser and server clients.
        cookieOptions: { name: "sb-shei-hoise-auth-token" },
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list) => {
            pendingCookies.push(...list);
          },
        },
      },
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: staffEmailFor(username),
      password,
    });

    if (signInError) {
      const failedCount = staff.failed_login_count + 1;
      const shouldLock = failedCount >= STAFF_MAX_FAILED_LOGINS;
      await supabaseAdmin
        .from("store_staff")
        .update({
          failed_login_count: shouldLock ? 0 : failedCount,
          locked_until: shouldLock
            ? new Date(Date.now() + STAFF_LOCK_MINUTES * 60_000).toISOString()
            : staff.locked_until,
        })
        .eq("id", staff.id);

      await logActivity(null, {
        storeId: staff.store_id,
        userId: staff.user_id,
        actorName,
        actorRole,
        action: shouldLock ? "auth.locked" : "auth.login_failed",
        entityType: "staff",
        entityId: staff.id,
        summary: shouldLock
          ? `Locked for ${STAFF_LOCK_MINUTES} minutes after ${STAFF_MAX_FAILED_LOGINS} wrong passwords for "${username}"`
          : `Wrong password for "${username}"`,
      });

      return shouldLock
        ? fail("locked", 429, { minutes: STAFF_LOCK_MINUTES })
        : fail("invalid", 401);
    }

    await supabaseAdmin
      .from("store_staff")
      .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq("id", staff.id);

    await logActivity(null, {
      storeId: staff.store_id,
      userId: staff.user_id,
      actorName,
      actorRole,
      action: "auth.login",
      entityType: "staff",
      entityId: staff.id,
      summary: "Logged in",
    });

    const response = NextResponse.json({ ok: true, mustChangePassword: staff.must_change_password });
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  } catch (err) {
    console.error("staff-login error:", err);
    return fail("error", 500);
  }
}
