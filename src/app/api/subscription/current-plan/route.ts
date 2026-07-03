import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_COLUMNS } from "@/lib/queries/subscription/getPublicPlans";

// Returns the caller's own currently-assigned plan (full row), bypassing RLS via
// the admin client, so a store can always see its own plan's details even if
// that plan's is_public flag has since been turned off. is_public only controls
// discoverability in the plan picker, not access to a plan you already have.
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: dbUser } = await supabase
      .from("users")
      .select("store_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!dbUser?.store_id) return Response.json(null, { status: 200 });

    const { data: sub } = await supabaseAdmin
      .from("store_subscriptions")
      .select("plan_id")
      .eq("store_id", dbUser.store_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.plan_id) return Response.json(null, { status: 200 });

    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select(PLAN_COLUMNS)
      .eq("id", sub.plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !plan) return Response.json(null, { status: 200 });

    return Response.json(plan, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
