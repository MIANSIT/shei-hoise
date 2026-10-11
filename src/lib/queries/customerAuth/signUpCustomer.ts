import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createCustomerAuthUser } from "./createCustomerAuthUserServer";

export interface SignUpCustomerResult {
  data: { user: User | null };
  error: AuthError | Error | null;
}

/**
 * Customer sign-up with no confirmation email: the login is created already
 * confirmed on the server, then signed in here. Returns the same
 * { data, error } shape as supabase.auth.signUp so callers keep their flow;
 * an existing account comes back as a "User already registered" error, which
 * those callers already handle by signing in.
 */
export async function signUpCustomer(
  email: string,
  password: string,
  metadata?: Record<string, string | null | undefined>,
): Promise<SignUpCustomerResult> {
  const created = await createCustomerAuthUser({ email, password, metadata });
  if (!created.ok) {
    return {
      data: { user: null },
      error: new Error(created.alreadyRegistered ? "User already registered" : created.error),
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { data: { user: null }, error };

  return { data: { user: data.user }, error: null };
}
