import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const submitSchema = z.object({
  store_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  payment_method: z.enum(["bkash", "nagad", "bank"]),
  payment_reference: z.string().min(1, "Reference is required"),
  sender_number: z.string().min(1, "Sender number is required"),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = submitSchema.parse(body);

    // Verify auth with the user-scoped client (respects RLS for reads)
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("store_id, user_type")
      .eq("id", user.id)
      .maybeSingle();

    const isSuperAdmin = dbUser?.user_type === "super_admin";

    if (!isSuperAdmin && dbUser?.store_id !== validated.store_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use the service-role admin client to bypass RLS for the UPDATE.
    // Auth has already been verified above.
    const { error } = await supabaseAdmin
      .from("subscription_invoices")
      .update({
        payment_method: validated.payment_method,
        payment_reference: validated.payment_reference,
        sender_number: validated.sender_number,
        notes: validated.notes ?? null,
        status: "submitted",
      })
      .eq("id", validated.invoice_id)
      .eq("store_id", validated.store_id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
