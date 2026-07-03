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

    const { error } = await supabaseAdmin
      .from("subscription_invoices")
      .update({ status: "cancelled" })
      .eq("id", invoice_id);

    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
