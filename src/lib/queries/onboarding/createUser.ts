// lib/actions/users/createUser.ts
"use server";

import {
  createUserSchema,
  CreateUserType,
} from "@/lib/schema/onboarding/user.schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createUserCore } from "@/lib/queries/onboarding/store/createUserCore";
import { createStoreWithSettings } from "@/lib/queries/onboarding/store/createStoreWithSettings";
import { DomainErrorCode } from "@/lib/errors/domainErrors";
import {
  isOnboardingEmailVerified,
  clearOnboardingVerification,
} from "@/lib/queries/onboarding/emailVerification";
import { sendWelcomeEmail } from "@/lib/email/welcomeEmail";
// ✅ Domain error codes for production

async function assignDefaultTrialPlan(storeId: string, userId: string): Promise<Date | null> {
  try {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, trial_days")
      .eq("is_default_trial_plan", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) return null;

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trial_days || 0));

    await supabaseAdmin.from("store_subscriptions").insert({
      store_id: storeId,
      user_id: userId,
      plan_id: plan.id,
      status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEndsAt.toISOString(),
    });

    return trialEndsAt;
  } catch (err) {
    console.error("assignDefaultTrialPlan failed (non-fatal):", err);
    return null;
  }
}

export async function createUser(data: CreateUserType) {
  const payload = createUserSchema.parse(data);

  let userId: string | null = null;
  let storeId: string | null = null;

  try {
    // 0️⃣ The store owner must have already verified this email via the
    // onboarding OTP step — checked server-side so this can't be bypassed
    // by calling this action directly.
    const isVerified = await isOnboardingEmailVerified(payload.email);
    if (!isVerified) {
      throw new Error(DomainErrorCode.EMAIL_NOT_VERIFIED);
    }

    // 1️⃣ Create user + profile
    userId = await createUserCore(payload);

    // 2️⃣ Create store + settings + social media
    if (payload.user_type === "store_owner") {
      storeId = await createStoreWithSettings({
        ownerId: userId,
        store: payload.store,
        settings: payload.store_settings,
      });

      // 3️⃣ Link user → store
      const { error: linkError } = await supabaseAdmin
        .from("users")
        .update({ store_id: storeId })
        .eq("id", userId);

      if (linkError) throw linkError;

      // 4️⃣ Auto-enroll into the default free trial plan, if one is configured.
      // Best-effort only — a store with no subscription row is treated as
      // unrestricted access everywhere else in the app, so a failure here
      // should never fail the whole signup.
      const trialEndsAt = await assignDefaultTrialPlan(storeId!, userId!);

      // 5️⃣ Welcome email — best-effort, never fails the signup itself.
      // This is the one point everything (user, store, settings, trial) is
      // definitively created, and every failure path above already rolls
      // back and throws instead of reaching here.
      try {
        await sendWelcomeEmail({
          toEmail: payload.email,
          ownerName: payload.first_name,
          storeName: payload.store.store_name,
          storeSlug: payload.store.store_slug,
          trialEndsAt,
        });
      } catch (emailErr) {
        console.error("sendWelcomeEmail failed (non-fatal):", emailErr);
      }
    }

    // The code has served its purpose — clean it up so it can't be reused.
    await clearOnboardingVerification(payload.email);

    return { success: true, userId, storeId };
  } catch (err: unknown) {
    console.error("createUser failed:", err);

    // 🔄 ROLLBACK: Delete everything in correct order
    try {
      if (storeId) {
        await supabaseAdmin
          .from("store_social_media")
          .delete()
          .eq("store_id", storeId);

        await supabaseAdmin.from("store_settings").delete().eq("store_id", storeId);

        await supabaseAdmin.from("stores").delete().eq("id", storeId);
      }

      if (userId) {
        // delete from DB
        await supabaseAdmin.from("users").delete().eq("id", userId);

        // delete from Auth safely
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (authErr) {
          console.error("Failed to delete Supabase Auth user:", authErr);
          // ✅ do not throw — we want rollback to continue
        }
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    // ✅ DOMAIN ERROR NORMALIZATION
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "email_exists"
    ) {
      throw new Error(DomainErrorCode.EMAIL_EXISTS);
    }

    // Already a known domain error (e.g. the pre-flight verification check
    // above) — pass it through as-is instead of masking it.
    if (
      err instanceof Error &&
      (Object.values(DomainErrorCode) as string[]).includes(err.message)
    ) {
      throw err;
    }

    throw new Error(DomainErrorCode.CREATE_USER_FAILED);
  }
}
