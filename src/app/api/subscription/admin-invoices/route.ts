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
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (dbUser?.user_type !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("subscription_invoices")
      .select(
        `id, invoice_number, plan_name, amount, currency, billing_cycle,
         status, due_date, paid_at, payment_method, payment_reference,
         sender_number, notes, created_at, updated_at, store_id,
         stores (store_name, store_slug)`,
      )
      .not("payment_reference", "is", null)
      .neq("status", "paid")
      .neq("status", "cancelled")
      .neq("status", "refunded")
      .order("updated_at", { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 400 });

    const rows = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const store = r.stores as { store_name: string | null; store_slug: string | null } | null;
      return {
        id: r.id,
        invoice_number: r.invoice_number,
        plan_name: r.plan_name,
        amount: r.amount,
        currency: r.currency,
        billing_cycle: r.billing_cycle,
        status: r.status,
        due_date: r.due_date,
        paid_at: r.paid_at,
        payment_method: r.payment_method,
        payment_reference: r.payment_reference,
        sender_number: r.sender_number,
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
        store_id: r.store_id,
        store_name: store?.store_name ?? null,
        store_slug: store?.store_slug ?? null,
      };
    });

    return Response.json(rows, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
