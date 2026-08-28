"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateVerificationCode, hashVerificationCode } from "@/lib/utils/emailVerificationCode";
import { sendVerificationCodeEmail } from "@/lib/email/verificationCodeEmail";
import { DomainErrorCode } from "@/lib/errors/domainErrors";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

const emailSchema = z.string().email().nonempty();
const codeSchema = z.string().regex(/^\d{6}$/, "Code must be 6 digits");

/**
 * Sends a 6-digit verification code to the given email so the onboarding
 * flow can confirm the store owner actually controls it before an account
 * is created. Keyed by raw email — there's no user row yet at this point.
 */
export async function sendOnboardingVerificationCode(rawEmail: string) {
  const email = emailSchema.parse(rawEmail).toLowerCase();

  // Don't send a code for an email that's already registered — createUser
  // would reject it anyway, so fail fast with the existing error code.
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    throw new Error(DomainErrorCode.EMAIL_EXISTS);
  }

  const { data: lastRow } = await supabaseAdmin
    .from("onboarding_email_verifications")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRow) {
    const elapsed = Date.now() - new Date(lastRow.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new Error(DomainErrorCode.RESEND_TOO_SOON);
    }
  }

  // Drop any previous codes for this email before issuing a new one.
  await supabaseAdmin.from("onboarding_email_verifications").delete().eq("email", email);

  const { rawCode, codeHash } = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("onboarding_email_verifications")
    .insert({ email, code_hash: codeHash, expires_at: expiresAt });

  if (insertError) throw insertError;

  await sendVerificationCodeEmail({ toEmail: email, code: rawCode });

  return { success: true };
}

/**
 * Verifies a code against the most recent one issued for this email.
 * Marks the row verified_at on success — createUser checks for that before
 * it will create the account, so this is a real server-side gate, not just
 * a client-side UI step.
 */
export async function verifyOnboardingVerificationCode(rawEmail: string, rawCode: string) {
  const email = emailSchema.parse(rawEmail).toLowerCase();
  const code = codeSchema.parse(rawCode);

  const { data: row, error } = await supabaseAdmin
    .from("onboarding_email_verifications")
    .select("id, code_hash, expires_at, verified_at, attempts")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error(DomainErrorCode.CODE_NOT_FOUND);

  if (row.verified_at) {
    return { success: true };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    throw new Error(DomainErrorCode.CODE_TOO_MANY_ATTEMPTS);
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error(DomainErrorCode.CODE_EXPIRED);
  }

  if (row.code_hash !== hashVerificationCode(code)) {
    await supabaseAdmin
      .from("onboarding_email_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    throw new Error(DomainErrorCode.CODE_INVALID);
  }

  await supabaseAdmin
    .from("onboarding_email_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  return { success: true };
}

/**
 * Used by createUser as the server-side gate — never trust the client to
 * have actually completed the verification step it walked through.
 */
export async function isOnboardingEmailVerified(rawEmail: string): Promise<boolean> {
  const email = rawEmail.toLowerCase();

  const { data: row } = await supabaseAdmin
    .from("onboarding_email_verifications")
    .select("verified_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!row?.verified_at;
}

/** Cleanup after a successful signup — the code has served its purpose. */
export async function clearOnboardingVerification(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase();
  await supabaseAdmin.from("onboarding_email_verifications").delete().eq("email", email);
}
