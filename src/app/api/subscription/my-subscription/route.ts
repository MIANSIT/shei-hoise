import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    // Uses the admin client so the store's own plan is always visible here,
    // even if that plan's is_public flag has since been turned off — is_public
    // only controls plan *discoverability*, not access to a plan you already have.
    const { data, error } = await supabaseAdmin
      .from("store_subscriptions")
      .select(
        `id, store_id, plan_id, status, billing_cycle,
         started_at, expires_at, trial_ends_at, canceled_at,
         cancels_at_period_end, current_period_start, current_period_end,
         payment_provider, created_at,
         subscription_plans (name, slug, description, price_monthly, price_yearly, currency, features, limits)`,
      )
      .eq("store_id", dbUser.store_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return Response.json(null, { status: 200 });

    return Response.json(data, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
