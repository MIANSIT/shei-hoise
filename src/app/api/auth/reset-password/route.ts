import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ResetPasswordSchema } from "@/lib/schema/auth";
import { hashResetToken } from "@/lib/utils/passwordResetToken";

const INVALID_LINK_MESSAGE = "This reset link is invalid or has expired.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = ResetPasswordSchema.parse(body);

    const tokenHash = hashResetToken(token);

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id, user_id, redirect_type, store_slug, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .single();

    if (tokenError || !tokenRow || new Date(tokenRow.expires_at) < new Date()) {
      return Response.json({ error: INVALID_LINK_MESSAGE }, { status: 400 });
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(tokenRow.user_id, {
        password,
      });

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return Response.json(
      {
        redirectType: tokenRow.redirect_type as "admin" | "user",
        storeSlug: tokenRow.store_slug as string | null,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
