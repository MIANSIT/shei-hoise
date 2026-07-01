import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  invoice_id: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoice_id } = schema.parse(body);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: dbUser } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (dbUser?.user_type !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the invoice to get subscription_id
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("subscription_invoices")
      .select("subscription_id")
      .eq("id", invoice_id)
      .maybeSingle();

    if (fetchError || !invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Mark invoice as paid
    const { error: invoiceError } = await supabaseAdmin
      .from("subscription_invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", invoice_id);

    if (invoiceError) {
      return Response.json({ error: invoiceError.message }, { status: 400 });
    }

    // Activate the subscription directly — no trigger dependency
    if (invoice.subscription_id) {
      const { error: subError } = await supabaseAdmin
        .from("store_subscriptions")
        .update({ status: "active", updated_at: now })
        .eq("id", invoice.subscription_id);

      if (subError) {
        return Response.json({ error: subError.message }, { status: 400 });
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
