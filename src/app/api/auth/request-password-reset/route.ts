import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RequestPasswordResetSchema } from "@/lib/schema/auth";
import { generateResetToken } from "@/lib/utils/passwordResetToken";
import { sendPasswordResetEmail } from "@/lib/email/passwordResetEmail";

const GENERIC_RESPONSE = {
  message: "If an account exists for that email, a reset link has been sent.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type, storeSlug } = RequestPasswordResetSchema.parse(body);

    const { data: userId, error: lookupError } = await supabaseAdmin.rpc(
      "get_auth_user_id_by_email",
      { p_email: email }
    );

    // Always respond the same way whether or not the email matched a user —
    // don't let this endpoint be used to enumerate registered accounts.
    if (lookupError || !userId) {
      return Response.json(GENERIC_RESPONSE, { status: 200 });
    }

    // Drop any previous unused tokens for this user before issuing a new one.
    await supabaseAdmin
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", userId)
      .is("used_at", null);

    const { rawToken, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        redirect_type: type,
        store_slug: type === "user" ? storeSlug ?? null : null,
        expires_at: expiresAt,
      });

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({ toEmail: email, resetUrl });

    return Response.json(GENERIC_RESPONSE, { status: 200 });
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
