"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type CreateCustomerAuthUserResult =
  | { ok: true; userId: string }
  | { ok: false; alreadyRegistered: boolean; error: string };

/**
 * Creates a customer's login already confirmed, so no confirmation email is
 * sent (a customer only needs an email and password; the email OTP is for
 * store owners). Used instead of auth.signUp, which emails the customer and
 * fails with "Error sending confirmation email" whenever the mail server
 * can't deliver.
 */
export async function createCustomerAuthUser(input: {
  email: string;
  password: string;
  metadata?: Record<string, string | null | undefined>;
}): Promise<CreateCustomerAuthUserResult> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password) {
      return { ok: false, alreadyRegistered: false, error: "Email and password are required" };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { ...input.metadata, role: "customer" },
    });

    if (error || !data.user) {
      const message = error?.message ?? "Failed to create account";
      const alreadyRegistered =
        /already (been )?registered|already exists/i.test(message) ||
        (error as { code?: string } | null)?.code === "email_exists";
      return { ok: false, alreadyRegistered, error: message };
    }

    return { ok: true, userId: data.user.id };
  } catch (err) {
    return {
      ok: false,
      alreadyRegistered: false,
      error: err instanceof Error ? err.message : "Failed to create account",
    };
  }
}
